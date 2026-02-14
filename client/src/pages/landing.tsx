import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

const quoteFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  company: z.string().optional(),
  phone: z.string().optional(),
  projectType: z.string().min(1, "Please select a project type"),
  budget: z.string().optional(),
  message: z.string().min(10, "Please describe your project (at least 10 characters)"),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

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
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated: isLoggedIn } = useAuth();

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      phone: "",
      projectType: "",
      budget: "",
      message: "",
    },
  });

  const submitQuote = useMutation({
    mutationFn: async (data: QuoteFormValues) => {
      const res = await apiRequest("POST", "/api/quote-requests", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Quote Request Sent",
        description: "We'll get back to you within 24 hours with a custom proposal.",
      });
      setQuoteOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: QuoteFormValues) {
    submitQuote.mutate(data);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5" style={{ backdropFilter: "blur(20px)", backgroundColor: "rgba(10,10,15,0.8)" }}>
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
            <a href="#pricing" className="text-[13px] font-medium text-white hover:text-white/80 transition-colors whitespace-nowrap flex items-center gap-1.5" style={{ fontFamily: "Poppins, sans-serif" }} data-testid="link-nav-pricing"><Receipt className="w-3.5 h-3.5" />Pricing</a>
            <Link href="/questions"><span className="text-[13px] font-medium text-white hover:text-white/80 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer" style={{ fontFamily: "Poppins, sans-serif" }} data-testid="link-nav-qa"><MessageSquare className="w-3.5 h-3.5" />Q&A</span></Link>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => setQuoteOpen(true)}
              size="sm"
              className="hidden sm:inline-flex bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white font-medium text-[13px]"
              data-testid="button-nav-quote"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Get a Quote
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
              <Receipt className="w-4 h-4" />Pricing
            </a>
            <Link href="/questions">
              <span onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-white/70 active:bg-white/5 cursor-pointer" data-testid="link-mobile-qa">
                <MessageSquare className="w-4 h-4" />Q&A
              </span>
            </Link>
            <div className="pt-3 mt-2 border-t border-white/5 space-y-2">
              <Button
                onClick={() => { setQuoteOpen(true); setMobileMenuOpen(false); }}
                className="w-full bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white font-medium"
                data-testid="button-mobile-quote"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Get a Quote
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

      <section id="hero" className="relative pt-14 sm:pt-16 min-h-[100svh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="AI Solutions"
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
              AI-Powered Solutions{" "}
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                Built For Your Business.
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/60 leading-relaxed mb-8 sm:mb-10 max-w-2xl mx-auto" data-testid="text-hero-description">
              Custom websites, apps, and portals — designed and built with AI to help your business grow. No templates. No compromises.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
              <Button
                size="lg"
                onClick={() => setQuoteOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white text-base font-medium px-8"
                data-testid="button-hero-quote"
              >
                <Send className="w-4 h-4 mr-2" />
                Get a Quote
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white bg-white/5"
                onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
                data-testid="button-hero-services"
              >
                View Services
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
      </section>

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
              Solutions That{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Work</span>
            </h2>
            <p className="text-white/50 text-sm sm:text-lg max-w-2xl mx-auto">
              From concept to launch, we build digital experiences that drive results.
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
                    alt={service.title}
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
              Built Different.{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Built Better.</span>
            </h2>
            <p className="text-white/50 text-sm sm:text-lg max-w-2xl mx-auto">
              We don't just build things. We engineer intelligent solutions that evolve with your business.
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

      <section id="pricing" className="relative py-16 sm:py-24 md:py-32 border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.02] to-blue-500/[0.02]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4 sm:mb-6">
              <Receipt className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-white/70">Transparent Pricing</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-4" data-testid="text-pricing-title">
              Pay for What You{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Need</span>
            </h2>
            <p className="text-white/50 text-sm sm:text-lg max-w-2xl mx-auto">
              No bloated packages or hidden fees. Every project is quoted based on exactly what you need, billed by deliverable.
            </p>
          </div>

          <div className="max-w-4xl mx-auto mb-10 sm:mb-14">
            <div className="relative p-6 sm:p-10 rounded-md border border-violet-500/20 bg-gradient-to-b from-violet-500/[0.04] to-blue-500/[0.02]" data-testid="card-pricing-main">
              <div className="text-center mb-8 sm:mb-10">
                <h3 className="text-xl sm:text-2xl font-bold mb-2">Every Project is Custom-Quoted</h3>
                <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                  Tell us what you need and we'll send you a detailed proposal within 24 hours, broken down by exactly what you're paying for.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8 sm:mb-10">
                {[
                  { icon: Palette, label: "Page Design", desc: "Full-page layouts designed and built to your brand" },
                  { icon: Globe, label: "Custom Graphics & Assets", desc: "Images, icons, and visual elements tailored to your vision" },
                  { icon: Wrench, label: "Revisions & Updates", desc: "Changes and refinements until you're happy" },
                  { icon: HeadphonesIcon, label: "Consulting & Strategy", desc: "Planning and technical guidance via email" },
                  { icon: Code2, label: "Custom Development", desc: "Backend systems, APIs, and integrations" },
                  { icon: Shield, label: "Ongoing Support", desc: "Maintenance, updates, and monitoring" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3 p-3 sm:p-4 rounded-md bg-white/[0.03] border border-white/5" data-testid={`card-deliverable-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-gradient-to-br from-blue-500/20 to-violet-500/20 shrink-0">
                      <item.icon className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-center">
                <Button
                  size="lg"
                  onClick={() => setQuoteOpen(true)}
                  className="bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white text-base font-medium px-10"
                  data-testid="button-pricing-quote"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Get Your Free Quote
                </Button>
                <p className="text-xs text-white/30 mt-3">
                  Free consultation via email. No calls required.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto">
            {[
              { icon: Receipt, title: "Itemized Invoices", desc: "Every invoice shows exactly what was delivered and the rate for each item. Complete transparency." },
              { icon: Shield, title: "No Hidden Fees", desc: "Your quote is your price. We don't tack on surprise charges or vague \"miscellaneous\" line items." },
              { icon: Clock, title: "Flexible Payment Plans", desc: "Larger projects can be split into installments. Pay over time with automatic collection via Stripe." },
            ].map((item) => (
              <div key={item.title} className="text-center p-4 sm:p-5" data-testid={`card-benefit-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-white/[0.04] border border-white/5 mx-auto mb-3">
                  <item.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h4 className="text-sm font-semibold mb-1.5">{item.title}</h4>
                <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
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
            Tell us about your project and we'll craft a custom AI-powered solution
            tailored to your specific business needs. No templates, no compromises.
          </p>
          <Button
            size="lg"
            onClick={() => setQuoteOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white text-base font-medium px-10"
            data-testid="button-cta-quote"
          >
            <Send className="w-4 h-4 mr-2" />
            Get Your Free Quote
          </Button>
        </div>
      </section>

      <footer className="border-t border-white/5 pt-10 sm:pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10 mb-8 sm:mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/images/logo.png" alt="AI Powered Sites" className="w-9 h-9 rounded-md object-cover" />
                <span className="text-lg font-semibold">AI Powered Sites</span>
              </div>
              <p className="text-sm text-white/40 leading-relaxed mb-6">
                Crafting intelligent digital experiences powered by AI. Your vision, our expertise, limitless potential.
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
                  onClick={() => setQuoteOpen(true)}
                  className="bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white font-medium"
                  data-testid="button-footer-quote"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Get a Quote
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

      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent className="sm:max-w-lg bg-[#12121a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Get a Free Quote
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Tell us about your project and we'll send you a custom proposal within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your name"
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                          data-testid="input-quote-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@company.com"
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                          data-testid="input-quote-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">Company</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your company"
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                          data-testid="input-quote-company"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">Phone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(555) 000-0000"
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                          data-testid="input-quote-phone"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="projectType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">Project Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-quote-project-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#1a1a25] border-white/10 text-white">
                          <SelectItem value="website" className="text-white focus:bg-white/10 focus:text-white">Website</SelectItem>
                          <SelectItem value="forum" className="text-white focus:bg-white/10 focus:text-white">Forum / Community</SelectItem>
                          <SelectItem value="blog" className="text-white focus:bg-white/10 focus:text-white">Blog Platform</SelectItem>
                          <SelectItem value="backend" className="text-white focus:bg-white/10 focus:text-white">Backend / API</SelectItem>
                          <SelectItem value="support-portal" className="text-white focus:bg-white/10 focus:text-white">Support Portal</SelectItem>
                          <SelectItem value="docker" className="text-white focus:bg-white/10 focus:text-white">Docker Solutions</SelectItem>
                          <SelectItem value="opensource" className="text-white focus:bg-white/10 focus:text-white">Open Source App Hosting</SelectItem>
                          <SelectItem value="account-section" className="text-white focus:bg-white/10 focus:text-white">My Account Section</SelectItem>
                          <SelectItem value="billing-dashboard" className="text-white focus:bg-white/10 focus:text-white">Billing Dashboard</SelectItem>
                          <SelectItem value="ecommerce" className="text-white focus:bg-white/10 focus:text-white">E-Commerce</SelectItem>
                          <SelectItem value="other" className="text-white focus:bg-white/10 focus:text-white">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">Budget Range</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-quote-budget">
                            <SelectValue placeholder="Select budget" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#1a1a25] border-white/10 text-white">
                          <SelectItem value="under-1k" className="text-white focus:bg-white/10 focus:text-white">Under $1,000</SelectItem>
                          <SelectItem value="1k-5k" className="text-white focus:bg-white/10 focus:text-white">$1,000 - $5,000</SelectItem>
                          <SelectItem value="5k-10k" className="text-white focus:bg-white/10 focus:text-white">$5,000 - $10,000</SelectItem>
                          <SelectItem value="10k-25k" className="text-white focus:bg-white/10 focus:text-white">$10,000 - $25,000</SelectItem>
                          <SelectItem value="25k+" className="text-white focus:bg-white/10 focus:text-white">$25,000+</SelectItem>
                          <SelectItem value="not-sure" className="text-white focus:bg-white/10 focus:text-white">Not Sure Yet</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Tell Us About Your Project</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your project, goals, and any specific requirements..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px] resize-none"
                        data-testid="input-quote-message"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={submitQuote.isPending}
                className="w-full bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white font-medium"
                data-testid="button-submit-quote"
              >
                {submitQuote.isPending ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Quote Request
                  </>
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
