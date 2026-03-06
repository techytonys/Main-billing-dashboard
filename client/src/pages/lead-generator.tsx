import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MapPin,
  Globe,
  Phone,
  Mail,
  Star,
  ExternalLink,
  Plus,
  Trash2,
  ScanLine,
  Building2,
  Loader2,
  Filter,
  Users,
  RefreshCw,
  Target,
  TrendingUp,
  Clock,
  MessageSquare,
  ChevronRight,
  Sparkles,
  Eye,
  CheckCircle,
  Send,
  AlertTriangle,
  Zap,
  Copy,
  Check,
  FileText,
} from "lucide-react";
import type { Lead } from "@shared/schema";

const BUSINESS_TYPES = [
  { value: "restaurant", label: "Restaurants" },
  { value: "plumber", label: "Plumbers" },
  { value: "dentist", label: "Dentists" },
  { value: "lawyer", label: "Lawyers" },
  { value: "real estate agent", label: "Real Estate" },
  { value: "auto repair", label: "Auto Repair" },
  { value: "salon", label: "Hair Salons" },
  { value: "gym fitness", label: "Gyms & Fitness" },
  { value: "accountant", label: "Accountants" },
  { value: "contractor", label: "Contractors" },
  { value: "veterinarian", label: "Veterinarians" },
  { value: "chiropractor", label: "Chiropractors" },
  { value: "florist", label: "Florists" },
  { value: "bakery", label: "Bakeries" },
  { value: "insurance agent", label: "Insurance" },
  { value: "photographer", label: "Photographers" },
  { value: "cleaning service", label: "Cleaning Services" },
  { value: "landscaping", label: "Landscaping" },
  { value: "roofing", label: "Roofing" },
  { value: "hvac", label: "HVAC" },
  { value: "electrician", label: "Electricians" },
  { value: "pest control", label: "Pest Control" },
  { value: "moving company", label: "Moving Companies" },
  { value: "daycare", label: "Daycare / Childcare" },
  { value: "pet grooming", label: "Pet Grooming" },
  { value: "tattoo shop", label: "Tattoo Shops" },
  { value: "barber shop", label: "Barber Shops" },
  { value: "nail salon", label: "Nail Salons" },
  { value: "car wash", label: "Car Wash" },
  { value: "towing service", label: "Towing" },
  { value: "massage therapy", label: "Massage Therapy" },
  { value: "tutoring", label: "Tutoring" },
  { value: "notary", label: "Notary Services" },
  { value: "pressure washing", label: "Pressure Washing" },
  { value: "junk removal", label: "Junk Removal" },
  { value: "handyman", label: "Handyman" },
  { value: "locksmith", label: "Locksmith" },
  { value: "food truck", label: "Food Trucks" },
  { value: "church", label: "Churches" },
  { value: "nonprofit", label: "Nonprofits" },
];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  contacted: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  interested: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  not_interested: "bg-red-500/10 text-red-400 border-red-500/20",
  converted: "bg-violet-500/10 text-violet-500 border-violet-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  not_interested: "Not Interested",
  converted: "Converted",
};

const EMAIL_TEMPLATES = [
  {
    id: "cold-intro",
    name: "Cold Introduction",
    subject: "Quick question about {{businessName}}'s online presence",
    body: `Hi there,

I came across {{businessName}} while researching businesses in your area, and I noticed {{noWebsite ? "you don't currently have a website" : "there might be some opportunities to improve your online presence"}}.

I help local businesses like yours get found on Google and turn visitors into customers. {{noWebsite ? "Having a professional website is one of the biggest factors in whether new customers find you or your competitors." : "Small changes to your website can make a big difference in how many customers find you."}}

Would you be open to a quick 10-minute call this week? No pressure — I'd just like to understand your goals and see if I can help.

Best,
AI Powered Sites
https://aipoweredsites.com`,
  },
  {
    id: "audit-followup",
    name: "Free Audit Offer",
    subject: "I found some things on {{businessName}}'s website",
    body: `Hi,

I took a quick look at {{businessName}}'s website and found a few things that might be costing you customers — especially on mobile and in Google search rankings.

I put together a free report that breaks it all down in plain English. No technical jargon, just what's working, what's not, and what would make the biggest impact.

Want me to send it over? It's completely free, no strings attached.

Best,
AI Powered Sites
https://aipoweredsites.com`,
  },
  {
    id: "no-website",
    name: "No Website Pitch",
    subject: "{{businessName}} — are you losing customers to competitors?",
    body: `Hi,

I noticed {{businessName}} doesn't have a website yet. In today's market, that means potential customers searching for "{{category}} near me" are finding your competitors instead of you.

Here's what a professional website would do for your business:
• Show up when people search Google for your services
• Let customers book, call, or message you 24/7
• Build trust with reviews, photos, and your story
• Look professional and stand out from competitors

I build custom websites specifically for {{category}} businesses. I can have one live for you in about a week.

Would you like to see some examples of what I've built for similar businesses? Happy to chat anytime.

Best,
AI Powered Sites
https://aipoweredsites.com`,
  },
  {
    id: "followup",
    name: "Follow-up",
    subject: "Re: {{businessName}}'s online presence",
    body: `Hi,

I reached out last week about {{businessName}}'s {{noWebsite ? "online presence" : "website"}} and wanted to follow up in case my message got buried.

I work with local businesses like yours to help them get more customers from Google. {{noWebsite ? "A professional website is the single biggest thing you could do to grow right now." : "Even small improvements to your site could bring in more leads."}}

If now isn't the right time, no worries at all. But if you're curious, I'm happy to show you what I had in mind — it would only take 10 minutes.

Best,
AI Powered Sites
https://aipoweredsites.com`,
  },
];

interface SearchResult {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  reviewCount: number;
  category: string | null;
  businessStatus: string;
}

interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  domain: string | null;
  emailGuess: string | null;
  scrapedEmails: string[];
  guessedEmails: string[];
  hunterEmails: string[];
  verifiedEmails: string[];
  hunterContacts: Array<{
    email: string;
    firstName: string | null;
    lastName: string | null;
    position: string | null;
    department: string | null;
    confidence: number;
    type: "personal" | "generic";
    linkedin: string | null;
    twitter: string | null;
    phone: string | null;
  }>;
  emailPattern: string | null;
  organization: string | null;
  hasMx: boolean;
  emailSource: "scraped" | "guessed" | "hunter" | "verified" | "both" | "none";
  rating: number | null;
  reviewCount: number;
  category: string | null;
  googleMapsUrl: string | null;
}

function fillTemplate(template: string, vars: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\s*\?\s*"([^"]*)"\s*:\s*"([^"]*)"\}\}/g, (_, key, ifTrue, ifFalse) => {
    return vars[key] ? ifTrue : ifFalse;
  }).replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

export default function LeadGenerator() {
  usePageTitle("Lead Generator");
  const { toast } = useToast();
  const [zipCode, setZipCode] = useState("");
  const [businessType, setBusinessType] = useState("restaurant");
  const [customQuery, setCustomQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"search" | "leads">("search");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [scrapingLeadId, setScrapingLeadId] = useState<string | null>(null);
  const [findEmailOpen, setFindEmailOpen] = useState(false);
  const [findFirstName, setFindFirstName] = useState("");
  const [findLastName, setFindLastName] = useState("");
  const [findEmailResult, setFindEmailResult] = useState<any>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailLead, setEmailLead] = useState<Lead | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [showNoWebsiteOnly, setShowNoWebsiteOnly] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const { data: savedLeads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const searchMutation = useMutation({
    mutationFn: async ({ zip, query }: { zip: string; query: string }) => {
      const params = new URLSearchParams({ zipCode: zip, query });
      const res = await apiRequest("GET", `/api/leads/search?${params}`);
      return res.json();
    },
    onSuccess: (data) => {
      setSearchResults(data.results || []);
      setHasSearched(true);
      const noWebsiteCount = (data.results || []).filter((r: SearchResult) => !r.category).length;
      if (data.results?.length === 0) {
        toast({ title: "No results", description: "Try a different search or zip code." });
      } else {
        toast({ title: `Found ${data.results.length} businesses` });
      }
    },
    onError: () => {
      toast({ title: "Search failed", description: "Could not search businesses. Check your API key.", variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (leadData: any) => {
      const res = await apiRequest("POST", "/api/leads", leadData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead saved", description: "Business added to your leads." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setEditingLead(null);
      toast({ title: "Lead updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead removed" });
    },
  });

  const findEmailMutation = useMutation({
    mutationFn: async ({ domain, firstName, lastName }: { domain: string; firstName: string; lastName: string }) => {
      const res = await apiRequest("POST", "/api/leads/find-email", { domain, firstName, lastName });
      return res.json();
    },
    onSuccess: (data) => {
      setFindEmailResult(data);
      if (data.found) {
        toast({ title: "Email found!", description: data.contact?.email });
      } else {
        toast({ title: "No email found", description: "Could not find an email for that person.", variant: "destructive" });
      }
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: { to: string; subject: string; html: string; leadId?: string }) => {
      const res = await apiRequest("POST", "/api/leads/send-outreach", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
        setEmailDialogOpen(false);
        toast({ title: "Email sent!", description: `Outreach email sent to ${emailTo}` });
      } else {
        toast({ title: "Failed to send", description: data.error || "Email could not be sent", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Failed to send email", variant: "destructive" });
    },
  });

  const handleSearch = () => {
    if (!zipCode.trim()) {
      toast({ title: "Enter a zip code", description: "A zip code is required to search.", variant: "destructive" });
      return;
    }
    const query = customQuery.trim() || businessType;
    searchMutation.mutate({ zip: zipCode.trim(), query });
  };

  const handleGetDetails = async (placeId: string) => {
    setLoadingDetails(placeId);
    try {
      const res = await apiRequest("GET", `/api/leads/place-details/${placeId}`);
      const details = await res.json();
      setPlaceDetails(details);
      setSelectedPlaceId(placeId);
    } catch {
      toast({ title: "Failed to get details", variant: "destructive" });
    } finally {
      setLoadingDetails(null);
    }
  };

  const handleSaveLead = (details: PlaceDetails) => {
    saveMutation.mutate({
      businessName: details.name,
      address: details.address,
      phone: details.phone,
      website: details.website,
      domain: details.domain,
      emailGuess: details.emailGuess,
      googlePlaceId: details.placeId,
      googleRating: details.rating ? String(details.rating) : null,
      googleReviewCount: details.reviewCount,
      category: details.category,
      zipCode: zipCode,
      status: "new",
    });
  };

  const handleRunAudit = (website: string) => {
    window.open(`/?audit=${encodeURIComponent(website)}`, "_blank");
  };

  const handleScrapeEmails = async (lead: Lead) => {
    if (!lead.website) return;
    setScrapingLeadId(lead.id);
    try {
      const res = await apiRequest("POST", "/api/leads/scrape-email", { website: lead.website });
      const result = await res.json();
      const allEmails = [...(result.scrapedEmails || []), ...(result.hunterEmails || []), ...(result.verifiedEmails || []), ...(result.guessedEmails || [])].join(", ");
      await apiRequest("PATCH", `/api/leads/${lead.id}`, { emailGuess: allEmails || lead.emailGuess });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      if (result.scrapedEmails?.length > 0) {
        toast({ title: "Emails found!", description: `Found ${result.scrapedEmails.length} email(s) scraped from ${lead.domain || lead.website}` });
      } else if (result.hunterEmails?.length > 0) {
        toast({ title: "Emails found via Hunter.io!", description: `Found ${result.hunterEmails.length} verified email(s) for ${lead.domain}` });
      } else if (result.verifiedEmails?.length > 0) {
        toast({ title: "Verified email found!", description: `Verified ${result.verifiedEmails[0]} exists` });
      } else {
        toast({ title: "No emails found on website", description: result.hasMx ? "Domain accepts email. Guessed emails saved." : "Guessed emails have been saved instead." });
      }
    } catch {
      toast({ title: "Scrape failed", variant: "destructive" });
    } finally {
      setScrapingLeadId(null);
    }
  };

  const openEmailDialog = (lead: Lead) => {
    setEmailLead(lead);
    const firstEmail = lead.emailGuess?.split(",")[0]?.trim() || "";
    setEmailTo(firstEmail);
    setSelectedTemplate("");
    setEmailSubject("");
    setEmailBody("");
    setEmailDialogOpen(true);
  };

  const applyTemplate = (templateId: string) => {
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (!template || !emailLead) return;
    setSelectedTemplate(templateId);
    const vars = {
      businessName: emailLead.businessName,
      category: emailLead.category || "local",
      noWebsite: !emailLead.website,
    };
    setEmailSubject(fillTemplate(template.subject, vars));
    setEmailBody(fillTemplate(template.body, vars));
  };

  const handleSendEmail = () => {
    if (!emailTo || !emailSubject || !emailBody) return;
    const html = emailBody.split("\n").map(line =>
      line.trim() === "" ? "<br>" : `<p style="margin:0 0 8px 0;font-family:sans-serif;font-size:15px;color:#333;">${line}</p>`
    ).join("");
    sendEmailMutation.mutate({
      to: emailTo,
      subject: emailSubject,
      html,
      leadId: emailLead?.id,
    });
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const filteredLeads = statusFilter === "all"
    ? savedLeads
    : savedLeads.filter(l => l.status === statusFilter);

  const noWebsiteLeads = savedLeads.filter(l => !l.website);

  const leadStats = {
    total: savedLeads.length,
    new: savedLeads.filter(l => l.status === "new").length,
    contacted: savedLeads.filter(l => l.status === "contacted").length,
    interested: savedLeads.filter(l => l.status === "interested").length,
    converted: savedLeads.filter(l => l.status === "converted").length,
    noWebsite: noWebsiteLeads.length,
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20">
            <Target className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Lead Generator</h1>
            <p className="text-sm text-muted-foreground">Find local businesses, get their emails, and send outreach — all in one place</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant={activeTab === "search" ? "default" : "outline"}
          onClick={() => setActiveTab("search")}
          className="gap-2"
          data-testid="button-tab-search"
        >
          <Search className="w-4 h-4" />
          Search
        </Button>
        <Button
          variant={activeTab === "leads" ? "default" : "outline"}
          onClick={() => setActiveTab("leads")}
          className="gap-2"
          data-testid="button-tab-leads"
        >
          <Users className="w-4 h-4" />
          My Leads
          {savedLeads.length > 0 && (
            <Badge variant="secondary" className="ml-1">{savedLeads.length}</Badge>
          )}
        </Button>
      </div>

      {activeTab === "search" && (
        <div className="space-y-6">
          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-background to-muted/30">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-medium">Find Businesses Near You</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-shrink-0 sm:w-44">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Zip Code"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="pl-9 h-12 text-base rounded-xl border-2 focus:border-violet-500 transition-colors"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    data-testid="input-zip-code"
                  />
                </div>

                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger className="h-12 rounded-xl border-2 sm:w-48" data-testid="select-business-type">
                    <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map(bt => (
                      <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Or type a custom search..."
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    className="pl-9 h-12 text-base rounded-xl border-2 focus:border-violet-500 transition-colors"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    data-testid="input-custom-query"
                  />
                </div>

                <Button
                  onClick={handleSearch}
                  disabled={searchMutation.isPending}
                  className="h-12 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white shadow-lg shadow-violet-500/25 transition-all"
                  data-testid="button-search"
                >
                  {searchMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Search
                </Button>
              </div>
            </div>
          </Card>

          {searchMutation.isPending && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="h-5 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {hasSearched && !searchMutation.isPending && searchResults.length === 0 && (
            <Card className="p-12 text-center border-dashed">
              <Building2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">No businesses found</h3>
              <p className="text-sm text-muted-foreground">Try a different zip code or business type</p>
            </Card>
          )}

          {searchResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-lg font-semibold">{searchResults.length} businesses found</h2>
                <Button
                  variant={showNoWebsiteOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowNoWebsiteOnly(!showNoWebsiteOnly)}
                  className="gap-1.5"
                  data-testid="button-filter-no-website"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  No Website Only
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.filter(() => true).map((result) => {
                  const isSaved = savedLeads.some(l => l.googlePlaceId === result.placeId);
                  return (
                    <Card
                      key={result.placeId}
                      className="p-5 hover:shadow-lg transition-all duration-200 border-2 hover:border-violet-500/30 group"
                      data-testid={`card-result-${result.placeId}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                            {result.name}
                          </h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{result.address}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 items-end ml-2">
                          {isSaved && (
                            <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                              Saved
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-4 flex-wrap">
                        {result.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-medium">{result.rating}</span>
                            <span className="text-xs text-muted-foreground">({result.reviewCount})</span>
                          </div>
                        )}
                        {result.category && (
                          <Badge variant="outline" className="text-xs capitalize">{result.category}</Badge>
                        )}
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGetDetails(result.placeId)}
                          disabled={loadingDetails === result.placeId}
                          className="gap-1.5"
                          data-testid={`button-details-${result.placeId}`}
                        >
                          {loadingDetails === result.placeId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          Details
                        </Button>
                        {!isSaved && selectedPlaceId !== result.placeId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-300 dark:hover:bg-violet-500/10"
                            onClick={() => handleGetDetails(result.placeId)}
                            data-testid={`button-save-${result.placeId}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            View & Save
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "leads" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-4 text-center cursor-pointer hover:shadow-md transition-all" onClick={() => setStatusFilter("all")} data-testid="stat-total">
              <div className="text-2xl font-bold">{leadStats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </Card>
            <Card className="p-4 text-center cursor-pointer hover:shadow-md transition-all" onClick={() => setStatusFilter("new")} data-testid="stat-new">
              <div className="text-2xl font-bold text-blue-500">{leadStats.new}</div>
              <div className="text-xs text-muted-foreground">New</div>
            </Card>
            <Card className="p-4 text-center cursor-pointer hover:shadow-md transition-all" onClick={() => setStatusFilter("contacted")} data-testid="stat-contacted">
              <div className="text-2xl font-bold text-amber-500">{leadStats.contacted}</div>
              <div className="text-xs text-muted-foreground">Contacted</div>
            </Card>
            <Card className="p-4 text-center cursor-pointer hover:shadow-md transition-all" onClick={() => setStatusFilter("interested")} data-testid="stat-interested">
              <div className="text-2xl font-bold text-emerald-500">{leadStats.interested}</div>
              <div className="text-xs text-muted-foreground">Interested</div>
            </Card>
            <Card className="p-4 text-center cursor-pointer hover:shadow-md transition-all" onClick={() => setStatusFilter("converted")} data-testid="stat-converted">
              <div className="text-2xl font-bold text-violet-500">{leadStats.converted}</div>
              <div className="text-xs text-muted-foreground">Converted</div>
            </Card>
            <Card className="p-4 text-center cursor-pointer hover:shadow-md transition-all border-orange-500/20" onClick={() => setStatusFilter("all")} data-testid="stat-no-website">
              <div className="text-2xl font-bold text-orange-500">{leadStats.noWebsite}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                No Website
              </div>
            </Card>
          </div>

          {leadStats.noWebsite > 0 && statusFilter === "all" && (
            <Card className="p-4 border-orange-500/20 bg-orange-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Zap className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">Hot Leads: {leadStats.noWebsite} businesses without a website</h3>
                  <p className="text-xs text-muted-foreground">These are your easiest sales — they know they need one. Reach out by phone or send them an email.</p>
                </div>
              </div>
            </Card>
          )}

          {leadsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="h-5 w-48 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </Card>
              ))}
            </div>
          ) : filteredLeads.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <Target className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">
                {statusFilter === "all" ? "No leads yet" : `No ${STATUS_LABELS[statusFilter]?.toLowerCase()} leads`}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {statusFilter === "all" ? "Search for businesses and save them as leads" : "Change the filter to see other leads"}
              </p>
              {statusFilter === "all" && (
                <Button onClick={() => setActiveTab("search")} className="gap-2" data-testid="button-go-search">
                  <Search className="w-4 h-4" />
                  Find Businesses
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredLeads.map(lead => (
                <Card
                  key={lead.id}
                  className={`p-5 hover:shadow-md transition-all duration-200 border-l-4 ${!lead.website ? "bg-orange-500/5 border-l-orange-500" : ""}`}
                  style={{ borderLeftColor: !lead.website ? undefined : lead.status === "new" ? "#3b82f6" : lead.status === "contacted" ? "#f59e0b" : lead.status === "interested" ? "#10b981" : lead.status === "converted" ? "#8b5cf6" : "#ef4444" }}
                  data-testid={`card-lead-${lead.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-base">{lead.businessName}</h3>
                        <Badge className={`text-xs ${STATUS_COLORS[lead.status] || ""}`}>
                          {STATUS_LABELS[lead.status] || lead.status}
                        </Badge>
                        {!lead.website && (
                          <Badge className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20 animate-pulse">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            No Website — Hot Lead!
                          </Badge>
                        )}
                        {lead.googleRating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs">{lead.googleRating}</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                        {lead.address && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{lead.address}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                            <a href={`tel:${lead.phone}`} className="hover:text-foreground transition-colors">{lead.phone}</a>
                            <button onClick={() => copyEmail(lead.phone!)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {copiedEmail === lead.phone ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                        {lead.website && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="hover:text-violet-500 transition-colors truncate" data-testid={`link-website-${lead.id}`}>
                              {lead.domain || lead.website}
                              <ExternalLink className="w-3 h-3 inline ml-1" />
                            </a>
                          </div>
                        )}
                        {lead.emailGuess && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-xs truncate" title={lead.emailGuess}>{lead.emailGuess.split(",")[0]}</span>
                            <button onClick={() => copyEmail(lead.emailGuess!.split(",")[0].trim())} className="hover:text-foreground">
                              {copiedEmail === lead.emailGuess!.split(",")[0].trim() ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                      </div>

                      {lead.notes && (
                        <div className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                          <MessageSquare className="w-3 h-3 inline mr-1" />
                          {lead.notes}
                        </div>
                      )}

                      {lead.lastContactedAt && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          Last contacted: {new Date(lead.lastContactedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {lead.emailGuess && (
                        <Button
                          size="sm"
                          onClick={() => openEmailDialog(lead)}
                          className="gap-1.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white text-xs"
                          data-testid={`button-email-${lead.id}`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send Email
                        </Button>
                      )}
                      {!lead.emailGuess && lead.phone && (
                        <a href={`tel:${lead.phone}`}>
                          <Button
                            size="sm"
                            className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs w-full"
                            data-testid={`button-call-${lead.id}`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Call
                          </Button>
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingLead(lead);
                          setEditNotes(lead.notes || "");
                          setEditStatus(lead.status);
                        }}
                        className="gap-1.5"
                        data-testid={`button-edit-${lead.id}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      {lead.website && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleScrapeEmails(lead)}
                            disabled={scrapingLeadId === lead.id}
                            className="gap-1.5 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-500/10"
                            data-testid={`button-scrape-${lead.id}`}
                          >
                            {scrapingLeadId === lead.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            {scrapingLeadId === lead.id ? "Scraping..." : "Find Emails"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRunAudit(lead.website!)}
                            className="gap-1.5 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10"
                            data-testid={`button-audit-${lead.id}`}
                          >
                            <ScanLine className="w-3.5 h-3.5" />
                            Audit
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(lead.id)}
                        className="gap-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                        data-testid={`button-delete-${lead.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!selectedPlaceId && !!placeDetails} onOpenChange={() => { setSelectedPlaceId(null); setPlaceDetails(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-violet-500" />
              {placeDetails?.name}
            </DialogTitle>
          </DialogHeader>
          {placeDetails && (
            <div className="space-y-4">
              <div className="space-y-3">
                {placeDetails.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm">{placeDetails.address}</span>
                  </div>
                )}
                {placeDetails.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${placeDetails.phone}`} className="text-sm hover:text-violet-500 transition-colors">
                      {placeDetails.phone}
                    </a>
                  </div>
                )}
                {placeDetails.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <a href={placeDetails.website} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-500 hover:underline flex items-center gap-1" data-testid="link-detail-website">
                      {placeDetails.domain || placeDetails.website}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {!placeDetails.website && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    <div>
                      <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">No website — Hot Lead!</span>
                      <p className="text-xs text-muted-foreground mt-0.5">This business needs a website. Save and contact them ASAP.</p>
                    </div>
                  </div>
                )}
                {placeDetails.scrapedEmails?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-green-500 mt-0.5" />
                    <div>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium block mb-1">
                        Found on website:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {placeDetails.scrapedEmails.map((email: string) => (
                          <Badge key={email} className="text-xs font-mono bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700">
                            {email}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {placeDetails.emailPattern && (
                  <div className="flex items-center gap-3">
                    <Target className="w-4 h-4 text-violet-500" />
                    <span className="text-xs text-violet-600 dark:text-violet-400">
                      Email pattern: <code className="bg-violet-100 dark:bg-violet-900/30 px-1.5 py-0.5 rounded text-violet-800 dark:text-violet-300 font-mono">{placeDetails.emailPattern}</code>
                    </span>
                  </div>
                )}
                {placeDetails.hunterContacts?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium block mb-2">
                        Contacts Found ({placeDetails.hunterContacts.length}):
                      </span>
                      <div className="space-y-2">
                        {placeDetails.hunterContacts.filter((c: any) => {
                          const pos = (c.position || "").toLowerCase();
                          return ["owner","founder","co-founder","ceo","president","principal","director","managing","partner","chief","head","vp","vice president","general manager","gm","proprietor"].some(t => pos.includes(t));
                        }).length > 0 && (
                          <div className="mb-2">
                            <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">Decision Makers</span>
                            <div className="mt-1 space-y-1.5">
                              {placeDetails.hunterContacts.filter((c: any) => {
                                const pos = (c.position || "").toLowerCase();
                                return ["owner","founder","co-founder","ceo","president","principal","director","managing","partner","chief","head","vp","vice president","general manager","gm","proprietor"].some(t => pos.includes(t));
                              }).map((contact: any) => (
                                <div key={contact.email} className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-foreground">
                                        {contact.firstName && contact.lastName ? `${contact.firstName} ${contact.lastName}` : contact.email}
                                      </span>
                                      <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                                        {contact.position}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[11px] font-mono text-muted-foreground">{contact.email}</span>
                                      <span className="text-[10px] text-green-600 dark:text-green-400">{contact.confidence}% confident</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {contact.phone && <span className="text-[10px] text-muted-foreground">{contact.phone}</span>}
                                      {contact.linkedin && (
                                        <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline">LinkedIn</a>
                                      )}
                                      {contact.twitter && (
                                        <a href={`https://twitter.com/${contact.twitter}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-sky-500 hover:underline">Twitter</a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {placeDetails.hunterContacts.filter((c: any) => {
                          const pos = (c.position || "").toLowerCase();
                          return !["owner","founder","co-founder","ceo","president","principal","director","managing","partner","chief","head","vp","vice president","general manager","gm","proprietor"].some(t => pos.includes(t));
                        }).length > 0 && (
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Other Contacts</span>
                            <div className="mt-1 space-y-1">
                              {placeDetails.hunterContacts.filter((c: any) => {
                                const pos = (c.position || "").toLowerCase();
                                return !["owner","founder","co-founder","ceo","president","principal","director","managing","partner","chief","head","vp","vice president","general manager","gm","proprietor"].some(t => pos.includes(t));
                              }).map((contact: any) => (
                                <div key={contact.email} className="flex items-center gap-2 p-1.5 rounded-md bg-muted/50">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-foreground">
                                        {contact.firstName && contact.lastName ? `${contact.firstName} ${contact.lastName}` : contact.email}
                                      </span>
                                      {contact.position && (
                                        <span className="text-[10px] text-muted-foreground">{contact.position}</span>
                                      )}
                                      <span className="text-[10px] text-green-600 dark:text-green-400">{contact.confidence}%</span>
                                    </div>
                                    <span className="text-[11px] font-mono text-muted-foreground">{contact.email}</span>
                                    {contact.linkedin && (
                                      <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline ml-2">LinkedIn</a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {placeDetails.hunterEmails?.length > 0 && !placeDetails.hunterContacts?.length && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-blue-500 mt-0.5" />
                    <div>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium block mb-1">
                        Verified via Hunter.io:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {placeDetails.hunterEmails.map((email: string) => (
                          <Badge key={email} className="text-xs font-mono bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                            {email}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {placeDetails.verifiedEmails?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <div>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium block mb-1">
                        Verified email exists:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {placeDetails.verifiedEmails.map((email: string) => (
                          <Badge key={email} className="text-xs font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700">
                            {email}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {placeDetails.hasMx && !placeDetails.scrapedEmails?.length && !placeDetails.hunterEmails?.length && (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-amber-600 dark:text-amber-400">Domain accepts email (MX records found)</span>
                  </div>
                )}
                {placeDetails.domain && (
                  <div className="flex items-center gap-3">
                    <Search className="w-4 h-4 text-indigo-500" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      data-testid="button-find-email-by-name"
                      onClick={() => {
                        setFindEmailOpen(true);
                        setFindFirstName("");
                        setFindLastName("");
                        setFindEmailResult(null);
                      }}
                    >
                      <Users className="w-3 h-3 mr-1" />
                      Find Email by Name
                    </Button>
                  </div>
                )}
                {placeDetails.guessedEmails?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">
                        {(placeDetails.scrapedEmails?.length > 0 || placeDetails.hunterEmails?.length > 0) ? "Other possible emails:" : "Best guesses (not found on site):"}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {placeDetails.guessedEmails.map((email: string) => (
                          <Badge key={email} variant="outline" className="text-xs font-mono">{email}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {placeDetails.emailSource === "none" && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">No email found — no website to scrape</span>
                  </div>
                )}
                {placeDetails.rating && (
                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm">{placeDetails.rating} stars ({placeDetails.reviewCount} reviews)</span>
                  </div>
                )}
                {placeDetails.googleMapsUrl && (
                  <div className="flex items-center gap-3">
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    <a href={placeDetails.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">
                      View on Google Maps
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  onClick={() => handleSaveLead(placeDetails)}
                  disabled={saveMutation.isPending || savedLeads.some(l => l.googlePlaceId === placeDetails.placeId)}
                  className="flex-1 gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white"
                  data-testid="button-save-lead"
                >
                  {savedLeads.some(l => l.googlePlaceId === placeDetails.placeId) ? (
                    <>Already Saved</>
                  ) : saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Save Lead
                    </>
                  )}
                </Button>
                {placeDetails.website && (
                  <Button
                    variant="outline"
                    onClick={() => handleRunAudit(placeDetails.website!)}
                    className="gap-2"
                    data-testid="button-audit-site"
                  >
                    <ScanLine className="w-4 h-4" />
                    Audit Site
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingLead} onOpenChange={() => setEditingLead(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Lead — {editingLead?.businessName}</DialogTitle>
          </DialogHeader>
          {editingLead && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Status</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger data-testid="select-lead-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="not_interested">Not Interested</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Notes</label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes about this lead..."
                  rows={4}
                  data-testid="textarea-lead-notes"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => updateMutation.mutate({
                    id: editingLead.id,
                    updates: {
                      status: editStatus,
                      notes: editNotes,
                      lastContactedAt: editStatus === "contacted" ? new Date() : undefined,
                    }
                  })}
                  disabled={updateMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white"
                  data-testid="button-save-edit"
                >
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => setEditingLead(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={findEmailOpen} onOpenChange={setFindEmailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-500" />
              Find Email by Name
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Search for a specific person's email at <strong>{placeDetails?.domain}</strong> using Hunter.io
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">First Name</label>
                <Input
                  value={findFirstName}
                  onChange={(e) => setFindFirstName(e.target.value)}
                  placeholder="John"
                  data-testid="input-find-first-name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Last Name</label>
                <Input
                  value={findLastName}
                  onChange={(e) => setFindLastName(e.target.value)}
                  placeholder="Smith"
                  data-testid="input-find-last-name"
                />
              </div>
            </div>
            <Button
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
              disabled={!findFirstName.trim() || !findLastName.trim() || findEmailMutation.isPending}
              data-testid="button-search-email"
              onClick={() => {
                if (placeDetails?.domain) {
                  findEmailMutation.mutate({
                    domain: placeDetails.domain,
                    firstName: findFirstName.trim(),
                    lastName: findLastName.trim(),
                  });
                }
              }}
            >
              {findEmailMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Searching...</>
              ) : (
                <><Search className="w-4 h-4 mr-2" /> Find Email</>
              )}
            </Button>
            {findEmailResult?.found && findEmailResult.contact && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400">Email Found!</span>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-mono text-foreground">{findEmailResult.contact.email}</div>
                  {findEmailResult.contact.position && (
                    <div className="text-xs text-muted-foreground">{findEmailResult.contact.position}</div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600">{findEmailResult.contact.confidence}% confidence</span>
                    {findEmailResult.contact.linkedin && (
                      <a href={findEmailResult.contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">LinkedIn</a>
                    )}
                  </div>
                </div>
              </div>
            )}
            {findEmailResult && !findEmailResult.found && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                No email found for {findFirstName} {findLastName} at {placeDetails?.domain}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-500" />
              Send Outreach Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{emailLead?.businessName}</span>
              {emailLead && !emailLead.website && (
                <Badge className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/20">No Website</Badge>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Use Template</label>
              <Select value={selectedTemplate} onValueChange={applyTemplate}>
                <SelectTrigger data-testid="select-email-template">
                  <FileText className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TEMPLATES.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To</label>
              <Input
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="email@example.com"
                data-testid="input-email-to"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subject</label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Subject line..."
                data-testid="input-email-subject"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Message</label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Write your message..."
                rows={10}
                className="font-mono text-sm"
                data-testid="textarea-email-body"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSendEmail}
                disabled={!emailTo || !emailSubject || !emailBody || sendEmailMutation.isPending}
                className="flex-1 gap-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white"
                data-testid="button-send-outreach"
              >
                {sendEmailMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-4 h-4" /> Send Email</>
                )}
              </Button>
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              Email will be sent via your configured email service. The lead will automatically be marked as "Contacted."
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
