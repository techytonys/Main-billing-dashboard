import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { usePageMeta } from "@/hooks/use-page-title";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, User, Phone, Mail, Shield, CheckCircle2,
  ArrowRight, Sparkles, Lock, Bell, XCircle, Building2,
  Globe, MapPin, Megaphone, Palette, Code, Search as SearchIcon,
  Smartphone, BarChart3, ShoppingCart, Zap
} from "lucide-react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
];

const REFERRAL_SOURCES = [
  { value: "google", label: "Google Search" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "referral", label: "Friend / Referral" },
  { value: "event", label: "Event / Conference" },
  { value: "podcast", label: "Podcast" },
  { value: "other", label: "Other" },
];

const INTERESTS = [
  { value: "web_design", label: "Website Design", icon: Palette },
  { value: "web_development", label: "Web Development", icon: Code },
  { value: "seo", label: "SEO & Marketing", icon: SearchIcon },
  { value: "mobile_app", label: "Mobile App", icon: Smartphone },
  { value: "ecommerce", label: "E-Commerce", icon: ShoppingCart },
  { value: "analytics", label: "Analytics & Tracking", icon: BarChart3 },
  { value: "automation", label: "AI & Automation", icon: Zap },
  { value: "branding", label: "Branding & Identity", icon: Megaphone },
];

export default function SmsSubscribe() {
  usePageMeta("Subscribe to SMS Updates", "Stay informed with SMS updates from AI Powered Sites. Get project updates, offers, and notifications delivered to your phone.", "https://aipoweredsites.com/subscribe");
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(formatPhone(raw));
  };

  const toggleInterest = (value: string) => {
    setSelectedInterests(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name");
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    if (!consent) {
      setError("You must agree to receive SMS messages to continue");
      return;
    }

    setSubmitting(true);
    try {
      const phoneFormatted = digits.length === 10 ? `+1${digits}` : `+${digits}`;
      const res = await fetch("/api/public/sms/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phoneFormatted,
          email: email.trim() || undefined,
          company: company.trim() || undefined,
          website: website.trim() || undefined,
          city: city.trim() || undefined,
          state: state || undefined,
          referralSource: referralSource || undefined,
          interests: selectedInterests.length > 0 ? selectedInterests.join(",") : undefined,
          consentGiven: consent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "bg-slate-800/60 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/20 h-12";

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
        <Card className="w-full max-w-lg relative bg-slate-900/80 backdrop-blur-xl border-slate-700/50 shadow-2xl" data-testid="card-subscribe-success">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">You're Subscribed!</h2>
            <p className="text-slate-400 mb-6">
              Welcome to the AI Powered Sites community, {firstName}! You'll receive updates, tips, and exclusive offers directly to your phone.
            </p>
            <div className="bg-slate-800/60 rounded-xl p-4 mb-6 border border-slate-700/50">
              <div className="flex items-center gap-3 text-left">
                <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Consent Recorded</p>
                  <p className="text-xs text-slate-400">Your opt-in consent has been securely logged with timestamp, IP address, and agreement text per TCPA and Twilio compliance requirements.</p>
                </div>
              </div>
            </div>
            {selectedInterests.length > 0 && (
              <div className="bg-slate-800/40 rounded-xl p-4 mb-6 border border-slate-700/30">
                <p className="text-sm text-slate-300 mb-2">Your interests:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {selectedInterests.map(i => {
                    const item = INTERESTS.find(x => x.value === i);
                    return item ? (
                      <span key={i} className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/30">{item.label}</span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            <div className="space-y-2 text-sm text-slate-500">
              <p>Reply <span className="font-bold text-slate-300">STOP</span> at any time to unsubscribe</p>
              <p>Reply <span className="font-bold text-slate-300">HELP</span> for assistance</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 py-12 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-blue-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "4s" }} />
      </div>

      <div className="w-full max-w-2xl mx-auto relative">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-indigo-300">Join 500+ Business Owners</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
            Get SMS Updates
          </h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            Exclusive tips, project updates, early access & offers — delivered straight to your phone.
          </p>
        </div>

        <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50 shadow-2xl" data-testid="card-subscribe-form">
          <CardContent className="pt-8 pb-8 px-6 md:px-10">
            <form onSubmit={handleSubmit} className="space-y-6">

              <div>
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">
                      First Name <span className="text-red-400">*</span>
                    </label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className={inputClass}
                      data-testid="input-subscribe-firstname"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">
                      Last Name <span className="text-red-400">*</span>
                    </label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className={inputClass}
                      data-testid="input-subscribe-lastname"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    Mobile Number <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="(555) 123-4567"
                    type="tel"
                    className={`${inputClass} text-lg tracking-wide`}
                    data-testid="input-subscribe-phone"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    Email Address <span className="text-slate-600 text-xs">(optional)</span>
                  </label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    type="email"
                    className={inputClass}
                    data-testid="input-subscribe-email"
                  />
                </div>
              </div>

              <div className="border-t border-slate-700/40 pt-6">
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-violet-400" />
                  Business Details <span className="text-slate-600 text-xs font-normal normal-case">(optional)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-violet-400" />
                      Company Name
                    </label>
                    <Input
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Acme Inc."
                      className={inputClass}
                      data-testid="input-subscribe-company"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      Website URL
                    </label>
                    <Input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      type="url"
                      className={inputClass}
                      data-testid="input-subscribe-website"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      City
                    </label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="New York"
                      className={inputClass}
                      data-testid="input-subscribe-city"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">State</label>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger className={`${inputClass} ${!state ? "text-slate-500" : ""}`} data-testid="select-subscribe-state">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {US_STATES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Megaphone className="w-3.5 h-3.5 text-pink-400" />
                      How did you find us?
                    </label>
                    <Select value={referralSource} onValueChange={setReferralSource}>
                      <SelectTrigger className={`${inputClass} ${!referralSource ? "text-slate-500" : ""}`} data-testid="select-subscribe-referral">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {REFERRAL_SOURCES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700/40 pt-6">
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  What interests you? <span className="text-slate-600 text-xs font-normal normal-case">(select all that apply)</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {INTERESTS.map(item => {
                    const isSelected = selectedInterests.includes(item.value);
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => toggleInterest(item.value)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 ${
                          isSelected
                            ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300 shadow-lg shadow-indigo-500/10"
                            : "bg-slate-800/40 border-slate-700/40 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                        }`}
                        data-testid={`button-interest-${item.value}`}
                      >
                        <item.icon className={`w-5 h-5 ${isSelected ? "text-indigo-400" : "text-slate-500"}`} />
                        <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-700/40 pt-6">
                <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/40 space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent"
                      checked={consent}
                      onCheckedChange={(checked) => setConsent(checked === true)}
                      className="mt-0.5 border-slate-500 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      data-testid="checkbox-consent"
                    />
                    <label htmlFor="consent" className="text-sm text-slate-300 leading-relaxed cursor-pointer select-none">
                      I agree to receive recurring SMS messages from <span className="font-semibold text-white">AI Powered Sites</span> at the phone number provided. Message frequency varies. Message and data rates may apply.{" "}
                      Reply <span className="font-bold text-white">STOP</span> to opt out at any time.{" "}
                      Reply <span className="font-bold text-white">HELP</span> for help.{" "}
                      I have read and agree to the{" "}
                      <a href="/terms" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">Terms of Service</a>
                      {" "}and{" "}
                      <a href="/privacy" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">Privacy Policy</a>.
                      <span className="text-red-400"> *</span>
                    </label>
                  </div>

                  {consent && (
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2.5 border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs font-medium">Consent will be logged with timestamp, IP address, and agreement text</span>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 rounded-lg px-4 py-3 border border-red-500/20" data-testid="text-subscribe-error">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || !consent}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
                data-testid="button-subscribe-submit"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Subscribing...
                  </span>
                ) : (
                  <>
                    <Bell className="w-5 h-5" />
                    Subscribe to SMS Updates
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 grid grid-cols-4 gap-4">
          {[
            { icon: Lock, label: "Secure & Private", desc: "256-bit encrypted" },
            { icon: MessageSquare, label: "Text STOP", desc: "Unsubscribe anytime" },
            { icon: Shield, label: "TCPA Compliant", desc: "Consent logged" },
            { icon: Bell, label: "No Spam", desc: "Only relevant updates" },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="w-11 h-11 mx-auto mb-2 rounded-xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-xs font-medium text-slate-300">{item.label}</p>
              <p className="text-[10px] text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-600 mt-8">
          © {new Date().getFullYear()} AI Powered Sites. Standard message and data rates may apply. Message frequency varies.
        </p>
      </div>
    </div>
  );
}
