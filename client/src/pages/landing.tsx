import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  ArrowRight,
  Sparkles,
  Globe,
  Code2,
  HeadphonesIcon,
  Layout,
  Zap,
  Shield,
  Clock,
  CheckCircle2,
  Send,
  Bot,
  Rocket,
  Star,
  LayoutDashboard,
  LogOut,
  Container,
  GitFork,
  UserCog,
  Receipt,
  Quote,
  Search,
  Palette,
  Wrench,
  PartyPopper,
  Mail,
  MapPin,
  Phone,
  ExternalLink,
  Menu,
  X,
  Loader2,
  Home,
  DollarSign,
  TrendingDown,
  Layers,
  Plug,
  Database,
  Key,
  FileCode2,
  Workflow,
  FileDown,
  Eye,
  Smartphone,
  Share2,
  FileText,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import heroImage from "../assets/images/hero-ai.png";
import serviceWebsites from "../assets/images/service-websites.png";
import serviceForums from "../assets/images/service-forums.png";
import serviceBlogs from "../assets/images/service-blogs.png";
import serviceBackends from "../assets/images/service-backends.png";
import serviceSupport from "../assets/images/service-support.png";
import serviceDocker from "../assets/images/service-docker.png";
import serviceOpensource from "../assets/images/service-opensource.png";
import serviceAccounts from "../assets/images/service-accounts.png";
import serviceBilling from "../assets/images/service-billing.png";
import apiIntegrationsImg from "../assets/images/api-integrations.png";

const services = [
  {
    title: "Custom Websites",
    description: "Stunning, responsive websites built with cutting-edge AI technology. From landing pages to full e-commerce platforms.",
    image: serviceWebsites,
    icon: Globe,
  },
  {
    title: "Community Forums",
    description: "Engage your audience with powerful, AI-moderated community forums that drive retention and loyalty.",
    image: serviceForums,
    icon: MessageSquare,
  },
  {
    title: "Blog Platforms",
    description: "Content-rich blogs with AI writing assistance, SEO optimization, and beautiful, engaging layouts.",
    image: serviceBlogs,
    icon: Layout,
  },
  {
    title: "Backend Systems",
    description: "Robust, scalable backend infrastructure with APIs, databases, and integrations built for performance.",
    image: serviceBackends,
    icon: Code2,
  },
  {
    title: "Support Portals",
    description: "Customer support portals with AI chatbots, ticket systems, and real-time communication channels.",
    image: serviceSupport,
    icon: HeadphonesIcon,
  },
  {
    title: "Docker Solutions",
    description: "Containerized deployments with Docker for scalable, portable, and consistent application infrastructure across any environment.",
    image: serviceDocker,
    icon: Container,
  },
  {
    title: "Open Source App Hosting",
    description: "We host and manage popular open source applications on dedicated servers for you — fully configured, maintained, and ready to use.",
    image: serviceOpensource,
    icon: GitFork,
  },
  {
    title: "My Account Sections",
    description: "Polished user account management interfaces with profile settings, preferences, security options, and activity history.",
    image: serviceAccounts,
    icon: UserCog,
  },
  {
    title: "Billing Dashboards",
    description: "Comprehensive billing and financial dashboards with invoice tracking, payment processing, and real-time revenue analytics.",
    image: serviceBilling,
    icon: Receipt,
  },
];

const features = [
  {
    icon: Bot,
    title: "AI-First Approach",
    description: "Every solution is powered by the latest AI models, delivering smarter, faster, and more intuitive experiences.",
  },
  {
    icon: Rocket,
    title: "Rapid Delivery",
    description: "Get your project live in days, not months. Our AI-accelerated workflow cuts development time dramatically.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade security built into every project. Your data and your customers' data stays protected.",
  },
  {
    icon: Clock,
    title: "24/7 Support",
    description: "Round-the-clock support with real humans and AI assistants to keep your business running smoothly.",
  },
];

const stats = [
  { value: "150+", label: "Projects Delivered" },
  { value: "99.9%", label: "Uptime Guaranteed" },
  { value: "48hr", label: "Average Turnaround" },
  { value: "5.0", label: "Client Rating", icon: Star },
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "CEO, TechFlow",
    quote: "They turned our vision into reality in under two weeks. The AI-powered features they built into our platform have tripled our user engagement.",
    rating: 5,
  },
  {
    name: "Marcus Rivera",
    role: "Founder, GreenLeaf Co.",
    quote: "Incredible attention to detail and communication throughout the entire project. Our new site is fast, beautiful, and converts like crazy.",
    rating: 5,
  },
  {
    name: "Emily Nakamura",
    role: "Director of Ops, Skyline Media",
    quote: "We needed a complex billing dashboard and support portal fast. They delivered both ahead of schedule and the quality blew us away.",
    rating: 5,
  },
];

const processSteps = [
  {
    step: 1,
    icon: Mail,
    title: "Contact Us",
    description: "Send us an email describing your project and goals. We'll review everything and get back to you quickly.",
  },
  {
    step: 2,
    icon: Palette,
    title: "Design",
    description: "We craft a custom design and architecture tailored specifically to your needs and brand.",
  },
  {
    step: 3,
    icon: Wrench,
    title: "Build",
    description: "Our AI-accelerated development process brings your project to life with precision and speed.",
  },
  {
    step: 4,
    icon: PartyPopper,
    title: "Launch",
    description: "We deploy, test, and hand over your polished product with full documentation and support.",
  },
];

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const subscribe = useMutation({
    mutationFn: async () => {
      const [firstName, ...rest] = name.trim().split(" ");
      const lastName = rest.join(" ") || undefined;
      const res = await apiRequest("POST", "/api/newsletter/subscribe", {
        email: email.trim(),
        firstName: firstName || undefined,
        lastName,
      });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "You're in!", description: "Thanks for subscribing. We'll keep you posted." });
    },
    onError: () => {
      toast({ title: "Couldn't subscribe", description: "Please try again or contact us directly.", variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <div className="flex items-center justify-center gap-2 py-2" data-testid="text-newsletter-success">
        <CheckCircle2 className="w-4 h-4 text-green-400" />
        <span className="text-sm text-white/60">You're subscribed! Thanks for joining.</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (email.trim()) subscribe.mutate(); }}
      className="flex flex-col sm:flex-row gap-2"
      data-testid="form-newsletter"
    >
      <Input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm flex-1 sm:max-w-[160px]"
        data-testid="input-newsletter-name"
      />
      <Input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm flex-1"
        data-testid="input-newsletter-email"
      />
      <Button
        type="submit"
        disabled={subscribe.isPending}
        className="bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white text-sm font-medium shrink-0"
        data-testid="button-newsletter-subscribe"
      >
        {subscribe.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Mail className="w-3.5 h-3.5 mr-1.5" />
            Subscribe
          </>
        )}
      </Button>
    </form>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatName, setChatName] = useState("");
  const [chatEmail, setChatEmail] = useState("");
  const [chatSubject, setChatSubject] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [auditUrl, setAuditUrl] = useState("");
  const [auditEmail, setAuditEmail] = useState("");
  const [auditResult, setAuditResult] = useState<any>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [auditProgress, setAuditProgress] = useState(0);
  const [auditStage, setAuditStage] = useState("");
  const [auditLoading, setAuditLoading] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated: isLoggedIn } = useAuth();

  useEffect(() => {
    document.title = "AI Web Design Agency — Custom AI-Powered Websites & Web Development | AI Powered Sites";
    return () => { document.title = "AI Powered Sites"; };
  }, []);

  const auditStages = [
    { pct: 4, label: "Connecting to website..." },
    { pct: 9, label: "Fetching page content..." },
    { pct: 14, label: "Analyzing page structure..." },
    { pct: 19, label: "Checking title tags & meta data..." },
    { pct: 24, label: "Scanning structured data (JSON-LD)..." },
    { pct: 29, label: "Evaluating heading hierarchy..." },
    { pct: 34, label: "Measuring server response time..." },
    { pct: 39, label: "Checking image optimization..." },
    { pct: 44, label: "Testing mobile responsiveness..." },
    { pct: 49, label: "Inspecting security headers..." },
    { pct: 54, label: "Auditing accessibility (ARIA, alt text)..." },
    { pct: 59, label: "Reviewing Open Graph & social tags..." },
    { pct: 64, label: "Analyzing content quality & readability..." },
    { pct: 69, label: "Running keyword analysis..." },
    { pct: 74, label: "Extracting keyword density..." },
    { pct: 79, label: "Generating keyword recommendations..." },
    { pct: 84, label: "Analyzing backlink profile..." },
    { pct: 88, label: "Evaluating link structure..." },
    { pct: 92, label: "Compiling priority recommendations..." },
    { pct: 95, label: "Building your PDF report..." },
    { pct: 98, label: "Finalizing results..." },
  ];

  const runAudit = useMutation({
    mutationFn: async () => {
      setAuditLoading(true);
      setAuditProgress(0);
      setAuditStage("Initializing audit...");
      setAuditResult(null);

      const fetchPromise = fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: auditUrl }),
      });

      let stageIndex = 0;
      const minDuration = 8000;
      const stageInterval = minDuration / auditStages.length;

      const progressPromise = new Promise<void>((resolve) => {
        const tick = () => {
          if (stageIndex < auditStages.length) {
            setAuditProgress(auditStages[stageIndex].pct);
            setAuditStage(auditStages[stageIndex].label);
            stageIndex++;
            setTimeout(tick, stageInterval + Math.random() * 200);
          } else {
            resolve();
          }
        };
        setTimeout(tick, 300);
      });

      const [res] = await Promise.all([fetchPromise, progressPromise]);

      setAuditProgress(100);
      setAuditStage("Audit complete!");

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to audit website");
      }

      await new Promise(r => setTimeout(r, 600));
      return res.json();
    },
    onSuccess: (data) => {
      setAuditLoading(false);
      setAuditResult(data);
      setEmailDialogOpen(true);
      setTimeout(() => {
        document.getElementById("audit-results")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    },
    onError: (err: any) => {
      setAuditLoading(false);
      setAuditProgress(0);
      toast({ title: "Audit failed", description: err.message, variant: "destructive" });
    },
  });

  const sendReport = async () => {
    if (!auditEmail.trim() || !auditResult) return;
    setSendingEmail(true);
    try {
      const res = await fetch("/api/audit/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: auditEmail, auditData: auditResult }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to send report" }));
        throw new Error(err.message || "Failed to send report");
      }
      toast({ title: "Report sent!", description: "Check your email for the full PDF report." });
      setEmailDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message || "Could not send the report. You can still download it below.", variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  const downloadPdf = () => {
    if (!auditResult?.pdfBase64) return;
    const byteCharacters = atob(auditResult.pdfBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'website-audit-report.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleCategory = (name: string) => {
    setExpandedCategories(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const categoryIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      search: Search, zap: Zap, smartphone: Smartphone,
      shield: Shield, eye: Eye, share2: Share2, fileText: FileText,
    };
    const Icon = icons[iconName] || BarChart3;
    return <Icon className="w-4 h-4" />;
  };

  const statusBadge = (status: string) => {
    if (status === 'pass') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" /> Pass</span>;
    if (status === 'warning') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">! Warning</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/15 text-red-400 border border-red-500/20"><X className="w-3 h-3" /> Fail</span>;
  };

  const startConversation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/public/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: chatName, email: chatEmail, subject: chatSubject, message: chatMessage }),
      });
      if (!res.ok) throw new Error("Failed to start conversation");
      return res.json();
    },
    onSuccess: (data) => {
      setChatOpen(false);
      setChatName(""); setChatEmail(""); setChatSubject(""); setChatMessage("");
      window.location.href = `/conversation/${data.accessToken}`;
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      <nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-50 border-b border-white/5" style={{ backdropFilter: "blur(20px)", backgroundColor: "rgba(10,10,15,0.8)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <img src="/images/logo.png" alt="AI Powered Sites" className="w-8 h-8 rounded-md object-cover" />
            <span className="text-base font-semibold tracking-tight whitespace-nowrap" data-testid="text-brand-name">AI Powered Sites</span>
          </div>
          <div className="hidden lg:flex items-center gap-4 xl:gap-6">
            <a href="#hero" className="text-[13px] font-medium text-white hover:text-white/80 transition-colors whitespace-nowrap flex items-center gap-1.5" style={{ fontFamily: "Poppins, sans-serif" }} data-testid="link-nav-home"><Home className="w-3.5 h-3.5" />Home</a>
            <a href="#services" className="text-[13px] font-medium text-white hover:text-white/80 transition-colors whitespace-nowrap flex items-center gap-1.5" style={{ fontFamily: "Poppins, sans-serif" }} data-testid="link-nav-services"><Layout className="w-3.5 h-3.5" />Services</a>
            <a href="#process" className="text-[13px] font-medium text-white hover:text-white/80 transition-colors whitespace-nowrap flex items-center gap-1.5" style={{ fontFamily: "Poppins, sans-serif" }} data-testid="link-nav-process"><Zap className="w-3.5 h-3.5" />Process</a>
            <a href="#features" className="text-[13px] font-medium text-white hover:text-white/80 transition-colors whitespace-nowrap flex items-center gap-1.5" style={{ fontFamily: "Poppins, sans-serif" }} data-testid="link-nav-features"><Shield className="w-3.5 h-3.5" />Why Us</a>
            <a href="#testimonials" className="text-[13px] font-medium text-white hover:text-white/80 transition-colors whitespace-nowrap flex items-center gap-1.5" style={{ fontFamily: "Poppins, sans-serif" }} data-testid="link-nav-testimonials"><Quote className="w-3.5 h-3.5" />Reviews</a>
            <a href="#pricing" className="text-[13px] font-medium text-white hover:text-white/80 transition-colors whitespace-nowrap flex items-center gap-1.5" style={{ fontFamily: "Poppins, sans-serif" }} data-testid="link-nav-pricing"><DollarSign className="w-3.5 h-3.5" />Pricing</a>
            <a href="#api" className="text-[13px] font-medium text-white hover:text-white/80 transition-colors whitespace-nowrap flex items-center gap-1.5" style={{ fontFamily: "Poppins, sans-serif" }} data-testid="link-nav-api"><Plug className="w-3.5 h-3.5" />API</a>
            <Link href="/questions"><span className="text-[13px] font-medium text-white hover:text-white/80 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer" style={{ fontFamily: "Poppins, sans-serif" }} data-testid="link-nav-qa"><MessageSquare className="w-3.5 h-3.5" />Q&A</span></Link>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => setChatOpen(true)}
              size="sm"
              className="hidden sm:inline-flex bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white font-medium text-[13px]"
              data-testid="button-nav-message"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
              Message Us
            </Button>
            {!authLoading && isLoggedIn && (
              <div className="hidden sm:flex items-center gap-1.5">
                <Link href="/admin">
                  <Button variant="outline" size="sm" className="border-white/20 text-white bg-white/5 text-[13px]" data-testid="button-nav-dashboard">
                    <LayoutDashboard className="w-3.5 h-3.5 mr-1" />
                    Dashboard
                  </Button>
                </Link>
                <a href="/api/logout">
                  <Button variant="ghost" size="icon" className="text-white/60" data-testid="button-nav-logout">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white/70"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/5 px-4 py-4 space-y-1" style={{ backgroundColor: "rgba(10,10,15,0.95)" }}>
            <a href="#hero" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-white/70 active:bg-white/5" data-testid="link-mobile-home">
              <Home className="w-4 h-4" />Home
            </a>
            <a href="#services" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-white/70 active:bg-white/5" data-testid="link-mobile-services">
              <Layout className="w-4 h-4" />Services
            </a>
            <a href="#process" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-white/70 active:bg-white/5" data-testid="link-mobile-process">
              <Zap className="w-4 h-4" />Process
            </a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-white/70 active:bg-white/5" data-testid="link-mobile-features">
              <Shield className="w-4 h-4" />Why Us
            </a>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-white/70 active:bg-white/5" data-testid="link-mobile-testimonials">
              <Quote className="w-4 h-4" />Reviews
            </a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-white/70 active:bg-white/5" data-testid="link-mobile-pricing">
              <DollarSign className="w-4 h-4" />Pricing
            </a>
            <a href="#api" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-white/70 active:bg-white/5" data-testid="link-mobile-api">
              <Plug className="w-4 h-4" />API
            </a>
            <Link href="/questions">
              <span onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-white/70 active:bg-white/5 cursor-pointer" data-testid="link-mobile-qa">
                <MessageSquare className="w-4 h-4" />Q&A
              </span>
            </Link>
            <div className="pt-3 mt-2 border-t border-white/5 space-y-2">
              <Button
                onClick={() => { setChatOpen(true); setMobileMenuOpen(false); }}
                className="w-full bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white font-medium"
                data-testid="button-mobile-message"
              >
                <MessageSquare className="w-4 h-4 mr-1.5" />
                Message Us
              </Button>
              {!authLoading && isLoggedIn && (
                <>
                  <Link href="/admin">
                    <Button variant="outline" className="w-full border-white/20 text-white bg-white/5" data-testid="button-mobile-dashboard">
                      <LayoutDashboard className="w-4 h-4 mr-1.5" />
                      Dashboard
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <main>
      <section id="hero" className="relative pt-14 sm:pt-16 min-h-[100svh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="AI-powered web design and development solutions by AI Powered Sites"
            className="w-full h-full object-cover animate-hero-zoom"
            data-testid="img-hero"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/70 via-[#0a0a0f]/60 to-[#0a0a0f]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/80 via-transparent to-[#0a0a0f]/40" />
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-blue-500/20 blur-[120px] animate-hero-glow-1" />
            <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-violet-500/20 blur-[120px] animate-hero-glow-2" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-purple-500/15 blur-[100px] animate-hero-glow-3" />
          </div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 md:py-32 flex items-center justify-center">
          <div className="max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 sm:mb-8" data-testid="badge-hero-tag">
              <Bot className="w-4 h-4 text-blue-400" />
              <span className="text-xs sm:text-sm text-white/70">AI-Powered Solutions</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-4 sm:mb-6" data-testid="text-hero-title">
              AI Web Design Agency{" "}
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                Built For Your Business.
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl font-medium text-white/70 leading-relaxed mb-10 sm:mb-12 max-w-2xl mx-auto" data-testid="text-hero-description">
              Custom websites, apps, and portals — powered by AI, built for growth. No templates. No compromises.
            </p>

            <div className="max-w-2xl mx-auto mb-8" data-testid="audit-form">
              <p className="text-sm font-medium text-white/70 mb-4 max-w-md mx-auto leading-relaxed">
                Free instant website audit — SEO, speed, mobile, security & more with a detailed PDF report.
              </p>
              <div className="relative group">
                <div className="absolute -inset-[1px] rounded-full bg-gradient-to-r from-blue-500/40 via-violet-500/30 to-blue-500/40 opacity-60 group-hover:opacity-100 transition-opacity duration-500 blur-[1px]" />
                <div className="relative bg-[#0a0f1e]/90 backdrop-blur-sm rounded-full border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4),0_1px_4px_rgba(59,130,246,0.1)]">
                  <div className="flex items-center h-[52px]">
                    <div className="flex items-center gap-2 pl-5 pr-3 flex-1 min-w-0">
                      <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                      <input
                        placeholder="Enter your website URL..."
                        value={auditUrl}
                        onChange={(e) => setAuditUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && auditUrl.trim() && !runAudit.isPending) runAudit.mutate(); }}
                        className="w-full bg-transparent text-white text-sm placeholder:text-white/25 outline-none min-w-0"
                        data-testid="input-audit-url"
                      />
                    </div>
                    <button
                      onClick={() => runAudit.mutate()}
                      disabled={!auditUrl.trim() || runAudit.isPending}
                      className="flex items-center justify-center gap-1.5 px-6 h-[42px] mx-[5px] bg-gradient-to-r from-blue-500 to-violet-500 disabled:from-blue-600 disabled:to-violet-600 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-full transition-all duration-300 shrink-0 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_28px_rgba(99,102,241,0.5)] hover:brightness-110"
                      data-testid="button-audit-submit"
                    >
                      {runAudit.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <><Search className="w-4 h-4" /><span className="hidden sm:inline">Free Audit</span><ArrowRight className="w-3.5 h-3.5 sm:hidden" /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {!auditLoading && (
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3">
                  <span className="flex items-center gap-1 text-[11px] text-white/30"><CheckCircle2 className="w-3 h-3 text-emerald-500/50" />SEO & Keywords</span>
                  <span className="flex items-center gap-1 text-[11px] text-white/30"><CheckCircle2 className="w-3 h-3 text-emerald-500/50" />Speed & Performance</span>
                  <span className="flex items-center gap-1 text-[11px] text-white/30"><CheckCircle2 className="w-3 h-3 text-emerald-500/50" />Mobile & Security</span>
                  <span className="flex items-center gap-1 text-[11px] text-white/30"><CheckCircle2 className="w-3 h-3 text-emerald-500/50" />Free PDF Report</span>
                </div>
              )}
            </div>

            {auditLoading && (
              <div className="max-w-2xl mx-auto mb-8 mt-4" data-testid="audit-progress">
                <div className="relative p-[1px] rounded-xl bg-gradient-to-r from-blue-500/30 via-violet-500/30 to-blue-500/30">
                  <div className="bg-[#0a0f1e] rounded-xl px-6 py-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-sm text-white/70 font-medium">{auditStage}</span>
                      </div>
                      <span className="text-sm font-bold text-blue-400">{auditProgress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-blue-400 transition-all duration-500 ease-out"
                        style={{ width: `${auditProgress}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-white/30">
                      <span>7 categories</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span>50+ checks</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span>Full PDF report</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
              <Button
                size="lg"
                onClick={() => setChatOpen(true)}
                className="bg-white/5 border border-white/10 text-white text-sm font-medium rounded-full w-full sm:w-[200px] h-[44px]"
                data-testid="button-hero-message"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Us a Message
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
      </section>

      {auditResult && (
        <section id="audit-results" className="relative py-12 sm:py-20 border-t border-white/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-white/70">Audit Results</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3" data-testid="text-audit-results-title">
                Your Website{" "}
                <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Score</span>
              </h2>
              <p className="text-white/40 text-sm max-w-lg mx-auto truncate">{auditResult.url}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="sm:col-span-1 flex flex-col items-center justify-center p-6 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className={`w-20 h-20 rounded-xl flex items-center justify-center text-3xl font-bold text-white mb-2 ${
                  auditResult.overallScore >= 75 ? 'bg-emerald-500/20 border border-emerald-500/30' :
                  auditResult.overallScore >= 50 ? 'bg-yellow-500/20 border border-yellow-500/30' :
                  'bg-red-500/20 border border-red-500/30'
                }`} data-testid="text-audit-grade">
                  {auditResult.grade}
                </div>
                <div className="text-2xl font-bold text-white" data-testid="text-audit-score">{auditResult.overallScore}<span className="text-sm text-white/40">/100</span></div>
                {auditResult.gradeLabel && (
                  <div className={`text-xs font-medium mt-1 ${
                    auditResult.overallScore >= 75 ? 'text-emerald-400' : auditResult.overallScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>{auditResult.gradeLabel}</div>
                )}
              </div>
              <div className="sm:col-span-2 p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                <p className="text-sm text-white/60 leading-relaxed mb-3" data-testid="text-audit-summary">{auditResult.summary}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button onClick={downloadPdf} size="sm" className="bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white text-xs" data-testid="button-download-pdf">
                    <FileDown className="w-3.5 h-3.5 mr-1.5" />
                    Download PDF Report
                  </Button>
                  <Button onClick={() => setEmailDialogOpen(true)} size="sm" variant="outline" className="border-white/15 text-white/80 bg-white/5 text-xs" data-testid="button-email-report">
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                    Email Report
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-8">
              {auditResult.categories.map((cat: any) => {
                const pct = Math.round((cat.score / cat.maxScore) * 100);
                return (
                  <button
                    key={cat.name}
                    onClick={() => toggleCategory(cat.name)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      expandedCategories[cat.name]
                        ? 'border-blue-500/40 bg-blue-500/10'
                        : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                    data-testid={`button-audit-category-${cat.name.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <div className={`text-lg font-bold mb-0.5 ${
                      pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{pct}%</div>
                    <div className="text-[10px] text-white/50 leading-tight">{cat.name}</div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              {auditResult.categories.map((cat: any) => {
                const pct = Math.round((cat.score / cat.maxScore) * 100);
                const isExpanded = expandedCategories[cat.name] !== false;
                return (
                  <div key={cat.name} className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden" data-testid={`audit-category-${cat.name.toLowerCase().replace(/\s/g, '-')}`}>
                    <button
                      onClick={() => toggleCategory(cat.name)}
                      className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          pct >= 75 ? 'bg-emerald-500/15 text-emerald-400' :
                          pct >= 50 ? 'bg-yellow-500/15 text-yellow-400' :
                          'bg-red-500/15 text-red-400'
                        }`}>
                          {categoryIcon(cat.icon)}
                        </div>
                        <span className="font-medium text-sm text-white/90">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 sm:w-32 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                pct >= 75 ? 'bg-emerald-400' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold min-w-[32px] text-right ${
                            pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'
                          }`}>{pct}%</span>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-2.5 border-t border-white/5 pt-3">
                        {cat.items.map((item: any, j: number) => (
                          <div key={j} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 p-3 rounded-lg bg-white/[0.02]">
                            <div className="shrink-0">{statusBadge(item.status)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-white/80 mb-0.5">{item.label}</div>
                              <div className="text-[11px] text-white/40 break-words">{item.detail}</div>
                              {item.recommendation && item.status !== 'pass' && (
                                <div className="text-[11px] text-blue-400/70 mt-1 flex items-start gap-1">
                                  <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
                                  <span>{item.recommendation}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 relative overflow-hidden rounded-2xl border border-blue-500/20" data-testid="audit-cta-banner">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-violet-600/15 to-blue-600/10" />
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-violet-500" />
              <div className="relative p-6 sm:p-8 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                  <span className="text-xs font-semibold text-blue-300 tracking-wide uppercase">Free Consultation</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  Get Your Free Website Strategy Session
                </h3>
                <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto mb-5 leading-relaxed">
                  {auditResult.overallScore < 60
                    ? `Your site is losing visitors and revenue. We'll show you exactly how to fix these issues and start growing your business online — at no cost.`
                    : auditResult.overallScore < 80
                    ? `Your site has real potential. Let us show you the quick wins that could boost your traffic by 50% or more — completely free.`
                    : `Your site is performing well! Let's fine-tune it to unlock even more traffic and conversions — on us.`
                  }
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>100% free, no strings attached</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Custom growth plan for your business</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>See results within days</span>
                  </div>
                </div>
                <Button
                  onClick={() => setChatOpen(true)}
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white font-semibold px-8 shadow-[0_0_24px_rgba(99,102,241,0.4)] hover:shadow-[0_0_32px_rgba(99,102,241,0.6)] hover:brightness-110 transition-all"
                  data-testid="button-audit-free-consult"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Claim Your Free Consultation
                </Button>
                <p className="text-[11px] text-white/25 mt-3">
                  Limited availability · Respond within 24 hours
                </p>
              </div>
            </div>

            {auditResult.topRecommendations?.length > 0 && (
              <div className="mt-6 p-5 sm:p-6 rounded-xl border border-white/5 bg-white/[0.02]">
                <h3 className="text-sm font-semibold text-white/90 mb-4 flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-blue-400" />
                  Top Recommendations
                </h3>
                <div className="space-y-2.5">
                  {auditResult.topRecommendations.slice(0, 6).map((rec: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-white/60 leading-relaxed">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section id="stats" className="relative py-12 sm:py-20 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                    {stat.value}
                  </span>
                  {stat.icon && <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />}
                </div>
                <span className="text-sm text-white/40">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="relative py-16 sm:py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4 sm:mb-6">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-white/70">What We Build</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-4" data-testid="text-services-title">
              Custom Web Development{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Services</span>
            </h2>
            <p className="text-white/50 text-sm sm:text-lg max-w-2xl mx-auto">
              From concept to launch, our AI-driven web design delivers responsive, mobile-first solutions that drive results.
              Every project is crafted with AI precision and human creativity.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {services.map((service) => (
              <div
                key={service.title}
                className="group relative rounded-md overflow-hidden border border-white/5 bg-white/[0.02] hover:border-white/10 transition-colors"
                data-testid={`card-service-${service.title.toLowerCase().replace(/\s/g, "-")}`}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={service.image}
                    alt={`${service.title} — AI Powered Sites service`}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-gradient-to-br from-blue-500/20 to-violet-600/20 border border-white/10" style={{ backdropFilter: "blur(8px)" }}>
                      <service.icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{service.title}</h3>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-white/50 text-sm leading-relaxed">{service.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="process" className="relative py-16 sm:py-24 md:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4 sm:mb-6">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-white/70">Our Process</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-4" data-testid="text-process-title">
              From Idea to{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Launch</span>
            </h2>
            <p className="text-white/50 text-sm sm:text-lg max-w-2xl mx-auto">
              A simple, transparent process that keeps you in control every step of the way.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {processSteps.map((step, idx) => (
              <div
                key={step.title}
                className="relative text-center p-4 sm:p-6 rounded-md border border-white/5 bg-white/[0.02]"
                data-testid={`card-process-${step.step}`}
              >
                {idx < processSteps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 z-10">
                    <ArrowRight className="w-6 h-6 text-white/10" />
                  </div>
                )}
                <div className="flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-md bg-gradient-to-br from-blue-500/10 to-violet-600/10 border border-white/10 mx-auto mb-3 sm:mb-4">
                  <step.icon className="w-5 h-5 sm:w-7 sm:h-7 text-blue-400" />
                </div>
                <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-violet-400 mb-1.5 sm:mb-2">Step {step.step}</div>
                <h3 className="text-sm sm:text-lg font-semibold mb-1.5 sm:mb-2">{step.title}</h3>
                <p className="text-white/50 text-xs sm:text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="relative py-16 sm:py-24 md:py-32 border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.02] to-violet-500/[0.02]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4 sm:mb-6">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-white/70">Why Choose Us</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-4" data-testid="text-features-title">
              Why Hire Our{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">AI Web Design Agency</span>
            </h2>
            <p className="text-white/50 text-sm sm:text-lg max-w-2xl mx-auto">
              We don't just build things. We deliver affordable custom web development with AI-first engineering that evolves with your business.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex gap-4 sm:gap-5 p-4 sm:p-6 rounded-md border border-white/5 bg-white/[0.02] hover:border-white/10 transition-colors"
                data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s/g, "-")}`}
              >
                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-md bg-gradient-to-br from-blue-500/10 to-violet-600/10 border border-white/10">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1.5">{feature.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="relative py-16 sm:py-24 md:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4 sm:mb-6">
              <Quote className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-white/70">Client Love</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-4" data-testid="text-testimonials-title">
              Trusted by{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Growing Businesses</span>
            </h2>
            <p className="text-white/50 text-sm sm:text-lg max-w-2xl mx-auto">
              Don't just take our word for it. Here's what our clients have to say.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="relative p-4 sm:p-6 rounded-md border border-white/5 bg-white/[0.02]"
                data-testid={`card-testimonial-${t.name.toLowerCase().replace(/\s/g, "-")}`}
              >
                <Quote className="w-8 h-8 text-violet-400/20 mb-4" />
                <p className="text-white/60 text-sm leading-relaxed mb-6">{t.quote}</p>
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-white/40">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="relative py-16 sm:py-28 md:py-36 border-t border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] via-transparent to-blue-500/[0.03]" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-emerald-500/[0.04] blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-500/[0.05] blur-[100px]" />
          <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full bg-violet-500/[0.04] blur-[100px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 mb-6 sm:mb-8">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-medium text-emerald-300/90">Simple, Honest Pricing</span>
            </div>
            <h2 className="text-[1.75rem] leading-[1.2] sm:text-4xl md:text-6xl font-bold tracking-tight mb-4 sm:mb-6" data-testid="text-pricing-title">
              Pay As You Go.{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">Only Pay for Results.</span>
            </h2>
            <p className="text-white/50 text-sm sm:text-base md:text-xl max-w-2xl mx-auto leading-relaxed px-2 sm:px-0">
              No subscriptions. No retainers. No surprise fees.
              <br className="hidden sm:block" />
              Every dollar goes toward deliverables you can see.
            </p>
          </div>

          <div className="max-w-6xl mx-auto mb-16 sm:mb-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 items-stretch">
              <div className="relative space-y-4 sm:space-y-5" data-testid="card-pricing-comparison">
                <div className="relative p-5 sm:p-8 rounded-md border border-red-500/10 bg-red-500/[0.02] opacity-50 group">
                  <div className="flex items-start gap-3.5 sm:gap-5">
                    <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-red-500/10 border border-red-500/15 shrink-0">
                      <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-400/80" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm sm:text-base font-semibold text-red-300/80 mb-1.5 sm:mb-2">The Old Way</h4>
                      <p className="text-sm text-white/35 leading-relaxed">Pay $3,000-$10,000+ upfront. Lock into retainers. Months of waiting. Hope it works out.</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {["Hidden fees", "Long contracts", "Slow delivery"].map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/[0.06] border border-red-500/10 text-[11px] text-red-400/60">
                            <X className="w-2.5 h-2.5" />{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 rotate-[-3deg] flex justify-center">
                    <div className="w-[90%] h-[2px] bg-gradient-to-r from-transparent via-red-400/30 to-transparent" />
                  </div>
                </div>

                <div className="relative p-5 sm:p-8 rounded-md border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.08] via-teal-500/[0.04] to-cyan-500/[0.06] shadow-lg shadow-emerald-500/[0.05]">
                  <div className="absolute -top-3.5 left-5 sm:left-6">
                    <span className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/25 text-[11px] sm:text-xs font-semibold text-emerald-300 shadow-lg shadow-emerald-500/10">
                      <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Our Approach
                    </span>
                  </div>
                  <div className="flex items-start gap-3.5 sm:gap-5 mt-3">
                    <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 shrink-0">
                      <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm sm:text-base font-semibold text-emerald-300 mb-1.5 sm:mb-2">Pay As You Go</h4>
                      <p className="text-sm text-white/55 leading-relaxed">You're billed per deliverable — per page designed, per feature built, per revision made. See every line item before you approve.</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {["Transparent", "No lock-in", "Scale anytime"].map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/15 text-[11px] text-emerald-400/80">
                            <CheckCircle2 className="w-2.5 h-2.5" />{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { icon: Receipt, title: "Billed Per Deliverable", desc: "Every page, feature, and asset is itemized. You see exactly what you're paying for — no bundled mystery charges.", color: "from-emerald-500/15 to-teal-500/15", iconColor: "text-emerald-400", border: "hover:border-emerald-500/20" },
                  { icon: Shield, title: "No Contracts or Commitments", desc: "Start a project, pause it, or wrap it up. There's no minimum spend, no lock-in period, no cancellation fees.", color: "from-blue-500/15 to-cyan-500/15", iconColor: "text-blue-400", border: "hover:border-blue-500/20" },
                  { icon: Clock, title: "Flexible Payment Plans", desc: "Bigger project? Split it into comfortable installments. We'll set up a plan that matches your cash flow.", color: "from-violet-500/15 to-purple-500/15", iconColor: "text-violet-400", border: "hover:border-violet-500/20" },
                  { icon: UserCog, title: "Full Transparency Portal", desc: "Track every deliverable, view invoices, approve work, and manage payments — all from your own dashboard.", color: "from-amber-500/15 to-orange-500/15", iconColor: "text-amber-400", border: "hover:border-amber-500/20" },
                ].map((item) => (
                  <div key={item.title} className={`group flex items-start gap-4 p-5 rounded-md bg-white/[0.02] border border-white/[0.06] ${item.border} transition-all duration-300 hover:bg-white/[0.04]`} data-testid={`card-benefit-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    <div className={`flex items-center justify-center w-11 h-11 rounded-md bg-gradient-to-br ${item.color} border border-white/[0.06] shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                      <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1 group-hover:text-white transition-colors">{item.title}</h4>
                      <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative p-6 sm:p-8 md:p-12 rounded-md border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] via-blue-500/[0.03] to-purple-500/[0.06] text-center overflow-hidden" data-testid="card-pricing-cta">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.08)_0%,transparent_60%)]" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[1px] bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/10 mx-auto mb-5 sm:mb-6 shadow-lg shadow-violet-500/10">
                  <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-violet-400" />
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">Ready to Get Started?</h3>
                <p className="text-white/50 text-xs sm:text-sm md:text-base max-w-lg mx-auto leading-relaxed mb-6 sm:mb-8 px-2 sm:px-0">
                  Tell us what you're building. We'll send you a clear, itemized proposal within 48 hours — completely free, zero obligation.
                </p>
                <Button
                  size="lg"
                  onClick={() => setChatOpen(true)}
                  className="bg-gradient-to-r from-blue-500 via-violet-500 to-purple-600 border-0 text-white text-sm sm:text-base font-semibold px-8 sm:px-12 py-5 sm:py-6 shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 transition-shadow duration-300"
                  data-testid="button-pricing-message"
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Start a Conversation
                </Button>
                <p className="text-[11px] sm:text-xs text-white/30 mt-4 sm:mt-5">
                  Free consultation. No calls. No pressure. Just a simple conversation via email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="api" className="relative py-20 sm:py-28 md:py-36 border-t border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.02] via-transparent to-cyan-500/[0.02]" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] rounded-full bg-blue-500/[0.04] blur-[120px]" />
          <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] rounded-full bg-cyan-500/[0.04] blur-[100px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-500/[0.08] border border-blue-500/20 mb-6 sm:mb-8">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-sm font-medium text-blue-300/90">Developer API</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 sm:mb-6" data-testid="text-api-title">
                Connect Your Tools with{" "}
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">Our API</span>
              </h2>
              <p className="text-white/50 text-base sm:text-lg leading-relaxed mb-8 sm:mb-10 max-w-lg">
                Pull project data into your own systems. Integrate customer info, invoices, and work entries directly into your workflow with secure API key authentication.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 sm:mb-10">
                {[
                  { icon: Key, title: "Secure API Keys", desc: "Scope-based permissions with read, write, and full access levels.", color: "from-blue-500/15 to-indigo-500/15", iconColor: "text-blue-400" },
                  { icon: Database, title: "Real-Time Data", desc: "Access customers, projects, invoices, and work entries instantly.", color: "from-cyan-500/15 to-teal-500/15", iconColor: "text-cyan-400" },
                  { icon: FileCode2, title: "Simple REST API", desc: "Clean JSON endpoints with beginner-friendly documentation.", color: "from-violet-500/15 to-purple-500/15", iconColor: "text-violet-400" },
                  { icon: Workflow, title: "Custom Integrations", desc: "Build dashboards, automate reports, or sync with any platform.", color: "from-emerald-500/15 to-green-500/15", iconColor: "text-emerald-400" },
                ].map((item) => (
                  <div key={item.title} className="group flex items-start gap-3.5 p-4 rounded-md bg-white/[0.02] border border-white/[0.06] hover:border-blue-500/20 hover:bg-white/[0.04] transition-all duration-300" data-testid={`card-api-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-md bg-gradient-to-br ${item.color} border border-white/[0.06] shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                      <item.icon className={`w-4.5 h-4.5 ${item.iconColor}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1 group-hover:text-white transition-colors">{item.title}</h4>
                      <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/api/docs">
                  <Button
                    className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 border-0 text-white font-semibold px-8 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-shadow duration-300"
                    data-testid="button-api-docs"
                  >
                    <FileCode2 className="w-4 h-4 mr-2" />
                    View API Docs
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="border-white/15 text-white bg-white/5 hover:bg-white/10 transition-colors"
                  onClick={() => setChatOpen(true)}
                  data-testid="button-api-contact"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Ask About Integrations
                </Button>
              </div>
            </div>

            <div className="order-1 lg:order-2 relative" data-testid="img-api-visual">
              <div className="relative rounded-md overflow-hidden border border-white/10 shadow-2xl shadow-blue-500/[0.08]">
                <div className="bg-[#0d1117] p-1">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                      <div className="w-3 h-3 rounded-full bg-green-500/60" />
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="px-4 py-1 rounded-md bg-white/[0.04] border border-white/[0.06]">
                        <span className="text-[11px] text-white/40 font-mono">api/v1/customers</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 font-mono text-[13px] leading-relaxed">
                    <div className="text-white/30 mb-1">
                      <span className="text-blue-400/70">GET</span> <span className="text-white/50">/api/v1/customers</span>
                    </div>
                    <div className="mt-3 text-white/25">{"{"}</div>
                    <div className="pl-4 text-white/25">"<span className="text-cyan-400/80">data</span>": {"["}</div>
                    <div className="pl-8 text-white/25">{"{"}</div>
                    <div className="pl-12"><span className="text-white/25">"</span><span className="text-emerald-400/80">name</span><span className="text-white/25">":</span> <span className="text-amber-400/70">"Acme Corp"</span><span className="text-white/20">,</span></div>
                    <div className="pl-12"><span className="text-white/25">"</span><span className="text-emerald-400/80">email</span><span className="text-white/25">":</span> <span className="text-amber-400/70">"hello@acme.com"</span><span className="text-white/20">,</span></div>
                    <div className="pl-12"><span className="text-white/25">"</span><span className="text-emerald-400/80">status</span><span className="text-white/25">":</span> <span className="text-amber-400/70">"active"</span></div>
                    <div className="pl-8 text-white/25">{"}"}</div>
                    <div className="pl-4 text-white/25">{"]"}</div>
                    <div className="text-white/25">{"}"}</div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/40 to-transparent pointer-events-none" />
              </div>
              <div className="absolute -bottom-4 -right-4 sm:-bottom-5 sm:-right-5 p-4 sm:p-5 rounded-md bg-[#12121a]/90 border border-white/10 shadow-xl" style={{ backdropFilter: "blur(16px)" }}>
                <div className="flex items-center gap-2.5 text-xs mb-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
                  <span className="text-white/70 font-semibold">API Status: Live</span>
                </div>
                <p className="text-[11px] text-white/30">v1 &middot; REST &middot; JSON &middot; Bearer Auth</p>
              </div>
              <div className="absolute -top-3 -left-3 sm:-top-4 sm:-left-4 p-3 sm:p-4 rounded-md bg-[#12121a]/90 border border-white/10 shadow-xl" style={{ backdropFilter: "blur(16px)" }}>
                <div className="flex items-center gap-2 text-xs">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span className="text-white/70 font-semibold">Encrypted</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="relative py-16 sm:py-24 md:py-32 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4 sm:mb-6">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-white/70">Common Questions</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-4" data-testid="text-faq-title">
              Frequently Asked{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Questions</span>
            </h2>
            <p className="text-white/50 text-sm sm:text-lg max-w-2xl mx-auto">
              Everything you need to know about our AI web design and custom web development services.
            </p>
          </div>
          <div className="space-y-4" data-testid="faq-list">
            {[
              { q: "How long does it take to build a custom website?", a: "Most projects are delivered within 48 hours to 2 weeks depending on complexity. Our AI-accelerated workflow cuts development time dramatically compared to traditional web design agencies." },
              { q: "What technologies do you use for web development?", a: "We use cutting-edge technologies including React, Node.js, PostgreSQL, Docker, and the latest AI models. Our custom React development services and Node.js web development ensure modern, scalable, responsive solutions." },
              { q: "Do you offer affordable web development for small businesses?", a: "Absolutely. We bill per deliverable — per page designed, per feature built — so you only pay for what we create. No retainers, no subscriptions. Our pricing works for startups and small businesses of any size." },
              { q: "How does your AI-powered web design process work?", a: "It's simple: contact us with your project details, we design a custom architecture, our AI-accelerated development brings it to life, then we deploy and hand over your polished product with full documentation and support." },
              { q: "Do you offer ongoing support and maintenance?", a: "Yes, we provide 24/7 support with real humans and AI assistants. Every client gets access to a dedicated support portal with ticket tracking, real-time communication, and project progress updates." },
              { q: "Can you build custom web applications and APIs?", a: "Yes. We build custom web applications, REST APIs, billing dashboards, support portals, community forums, and more. We also offer Docker deployment services for self-hosted infrastructure." },
            ].map((faq, i) => (
              <div key={i} className="p-5 sm:p-6 rounded-md border border-white/5 bg-white/[0.02]" data-testid={`faq-item-${i}`}>
                <h3 className="text-sm sm:text-base font-semibold mb-2 text-white/90">{faq.q}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-16 sm:py-24 md:py-32 border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/[0.03] to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-4 sm:mb-6" data-testid="text-cta-title">
            Ready to Build Something{" "}
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Extraordinary?
            </span>
          </h2>
          <p className="text-white/50 text-sm sm:text-lg max-w-2xl mx-auto mb-8 sm:mb-10">
            Tell us about your project and we'll craft a custom AI-powered web development solution
            tailored to your specific business needs. No templates, no compromises.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <Button
              size="lg"
              onClick={() => setChatOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white text-base font-medium px-10"
              data-testid="button-cta-message"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Us a Message
            </Button>
          </div>
        </div>
      </section>

      </main>
      <footer aria-label="Site footer" className="border-t border-white/5 pt-10 sm:pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10 mb-8 sm:mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/images/logo.png" alt="AI Powered Sites" className="w-9 h-9 rounded-md object-cover" />
                <span className="text-lg font-semibold">AI Powered Sites</span>
              </div>
              <p className="text-sm text-white/40 leading-relaxed mb-6">
                AI web design agency crafting custom websites, web applications, and digital experiences for startups and growing businesses.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 text-white/80">Services</h4>
              <ul className="space-y-2.5">
                <li><a href="#services" className="text-sm text-white/40 transition-colors" data-testid="link-footer-websites">Custom Websites</a></li>
                <li><a href="#services" className="text-sm text-white/40 transition-colors" data-testid="link-footer-forums">Community Forums</a></li>
                <li><a href="#services" className="text-sm text-white/40 transition-colors" data-testid="link-footer-backends">Backend Systems</a></li>
                <li><a href="#services" className="text-sm text-white/40 transition-colors" data-testid="link-footer-docker">Docker Solutions</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 text-white/80">Company</h4>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-sm text-white/40 transition-colors" data-testid="link-footer-features">Why Choose Us</a></li>
                <li><a href="#process" className="text-sm text-white/40 transition-colors" data-testid="link-footer-process">Our Process</a></li>
                <li><a href="#pricing" className="text-sm text-white/40 transition-colors" data-testid="link-footer-pricing">Pricing</a></li>
                <li><a href="#api" className="text-sm text-white/40 transition-colors" data-testid="link-footer-api">API</a></li>
                <li><a href="#testimonials" className="text-sm text-white/40 transition-colors" data-testid="link-footer-testimonials">Testimonials</a></li>
                <li><a href="#stats" className="text-sm text-white/40 transition-colors" data-testid="link-footer-results">Results</a></li>
                <li><Link href="/questions"><span className="text-sm text-white/40 transition-colors cursor-pointer" data-testid="link-footer-qa">Q&A</span></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 text-white/80">Get In Touch</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-white/30 shrink-0" />
                  <a href="mailto:hello@aipoweredsites.com" className="text-sm text-white/40 transition-colors" data-testid="link-footer-email">hello@aipoweredsites.com</a>
                </li>
                <li className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-white/30 shrink-0" />
                  <span className="text-sm text-white/40">Remote-First Team</span>
                </li>
              </ul>
              <div className="mt-6">
                <Button
                  size="sm"
                  onClick={() => setChatOpen(true)}
                  className="bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white font-medium"
                  data-testid="button-footer-message"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                  Message Us
                </Button>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 pb-6">
            <div className="max-w-xl mx-auto text-center mb-6">
              <h4 className="text-sm font-semibold mb-1.5" data-testid="text-newsletter-title">Stay in the Loop</h4>
              <p className="text-xs text-white/40 mb-4">Get tips on AI, web design, and business growth. No spam, ever.</p>
              <NewsletterForm />
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-white/20">&copy; {new Date().getFullYear()} AI Powered Sites. All rights reserved.</p>
            <p className="text-xs text-white/20">Built with AI. Powered by passion.</p>
          </div>
        </div>
      </footer>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#12121a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Mail className="w-5 h-5 text-violet-400" />
              Get Your Full Report
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Enter your email to receive the detailed PDF report with all recommendations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="text-center">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <span className="text-2xl font-bold" style={{ color: auditResult?.overallScore >= 75 ? '#22c55e' : auditResult?.overallScore >= 50 ? '#eab308' : '#ef4444' }}>
                  {auditResult?.grade}
                </span>
                <span className="text-white/50 text-sm">{auditResult?.overallScore}/100</span>
              </div>
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
              <input
                type="email"
                placeholder="your@email.com"
                value={auditEmail}
                onChange={(e) => setAuditEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && auditEmail.trim()) sendReport(); }}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white text-sm placeholder:text-white/25 outline-none focus:border-violet-500/50 transition-colors"
                data-testid="input-audit-email-dialog"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={sendReport}
                disabled={!auditEmail.trim() || sendingEmail}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-violet-500 disabled:from-blue-600 disabled:to-violet-600 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all"
                data-testid="button-send-report"
              >
                {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sendingEmail ? "Sending..." : "Email My Report"}
              </button>
              <button
                onClick={() => { downloadPdf(); setEmailDialogOpen(false); }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-white text-sm rounded-lg hover:bg-white/10 transition-colors"
                data-testid="button-download-report-dialog"
              >
                <FileDown className="w-4 h-4" />
                Download
              </button>
            </div>
            <p className="text-[11px] text-white/30 text-center">
              We'll include actionable tips to improve your score
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="sm:max-w-lg bg-[#12121a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              Start a Conversation
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Have a question or want to discuss a project? Send us a message and we'll reply directly to your secure conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-white/70 mb-1.5 block">Name</label>
                <Input
                  placeholder="Your name"
                  value={chatName}
                  onChange={(e) => setChatName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  data-testid="input-chat-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white/70 mb-1.5 block">Email</label>
                <Input
                  placeholder="you@example.com"
                  value={chatEmail}
                  onChange={(e) => setChatEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  data-testid="input-chat-email"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-white/70 mb-1.5 block">Subject</label>
              <Input
                placeholder="What would you like to discuss?"
                value={chatSubject}
                onChange={(e) => setChatSubject(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                data-testid="input-chat-subject"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70 mb-1.5 block">Message</label>
              <Textarea
                placeholder="Share any details, ideas, examples, or links you'd like us to see..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px] resize-none"
                data-testid="input-chat-message"
              />
            </div>
            <Button
              onClick={() => startConversation.mutate()}
              disabled={!chatName.trim() || !chatEmail.trim() || !chatSubject.trim() || !chatMessage.trim() || startConversation.isPending}
              className="w-full bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white font-medium"
              data-testid="button-start-conversation"
            >
              {startConversation.isPending ? (
                "Starting..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Start Conversation
                </>
              )}
            </Button>
            <p className="text-xs text-white/30 text-center">
              Your conversation is private and secure. You'll get a unique link to continue the discussion.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
