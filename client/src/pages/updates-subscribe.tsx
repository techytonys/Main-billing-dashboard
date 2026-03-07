import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Zap,
  Mail,
  Phone,
  User,
  Check,
  Loader2,
  ArrowRight,
  Lightbulb,
  Shield,
  Sparkles,
  Bell,
  Globe,
  Server,
  Lock,
} from "lucide-react";

export default function UpdatesSubscribe() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const subscribeMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/tips/subscribe", {
        email,
        phone: phone || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      }),
    onSuccess: () => {
      setSubscribed(true);
    },
    onError: (err: any) => {
      toast({ title: "Something went wrong", description: err.message, variant: "destructive" });
    },
  });

  const benefits = [
    { icon: Lightbulb, title: "Daily Tips", desc: "Beginner-friendly web tech tips delivered daily" },
    { icon: Server, title: "Hosting Secrets", desc: "Learn the ins and outs of web hosting" },
    { icon: Lock, title: "Security Alerts", desc: "Stay protected with security best practices" },
    { icon: Globe, title: "Industry Updates", desc: "What's new in AI, web design, and more" },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-emerald-500/[0.06] via-cyan-500/[0.03] to-transparent rounded-full blur-[120px]" />
        <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[400px] bg-gradient-to-tr from-blue-500/[0.04] to-transparent rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10">
        <header className="border-b border-white/[0.06]">
          <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5" data-testid="link-home">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white/90 text-sm tracking-wide">AI Powered Sites</span>
            </a>
            <a
              href="/tips"
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
              data-testid="link-tips"
            >
              Tip of the Day <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 pt-16 pb-24">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div className="lg:pt-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8">
                <Bell className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-gray-400 tracking-wide uppercase font-medium">Stay Updated</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-5 leading-[1.1]" data-testid="text-subscribe-title">
                Never miss
                <br />
                <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  an update.
                </span>
              </h1>
              <p className="text-base text-gray-500 leading-relaxed mb-10 max-w-md">
                Get daily tech tips, hosting secrets, and web industry insights delivered straight to your inbox and phone.
              </p>

              <div className="space-y-5">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:border-white/[0.12] transition-colors">
                      <b.icon className="w-4.5 h-4.5 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-0.5">{b.title}</h3>
                      <p className="text-xs text-gray-600">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              {subscribed ? (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-10 text-center" data-testid="text-subscribe-success">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                    <Check className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">You're in!</h2>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto mb-6">
                    Welcome aboard. You'll receive daily tips and updates{phone ? " via email and SMS" : " via email"}.
                  </p>
                  <a
                    href="/tips"
                    className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                    data-testid="link-back-to-tips"
                  >
                    Check out today's tip <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden" data-testid="card-subscribe-form">
                  <div className="h-px bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500" />
                  <div className="p-8 md:p-10">
                    <h2 className="text-xl font-bold text-white mb-1">Subscribe for Free</h2>
                    <p className="text-sm text-gray-500 mb-8">No spam, ever. Unsubscribe anytime.</p>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                          <Input
                            placeholder="First name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            data-testid="input-first-name"
                            className="pl-10 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-colors"
                          />
                        </div>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                          <Input
                            placeholder="Last name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            data-testid="input-last-name"
                            className="pl-10 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-colors"
                          />
                        </div>
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <Input
                          type="email"
                          placeholder="Email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          data-testid="input-email"
                          className="pl-10 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-colors"
                          required
                        />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <Input
                          type="tel"
                          placeholder="Phone number (optional, for SMS)"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          data-testid="input-phone"
                          className="pl-10 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-colors"
                        />
                      </div>

                      <button
                        onClick={() => subscribeMutation.mutate()}
                        disabled={subscribeMutation.isPending || !email.includes("@")}
                        data-testid="button-subscribe"
                        className="w-full group relative mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div
                          className="relative rounded-xl overflow-hidden"
                          style={{
                            transform: "translateY(0px)",
                            transition: "transform 150ms cubic-bezier(0.4, 0, 0.2, 1)",
                          }}
                          onMouseDown={(e) => {
                            if (!(e.currentTarget.parentElement as HTMLButtonElement)?.disabled) {
                              (e.currentTarget as HTMLElement).style.transform = "translateY(3px)";
                            }
                          }}
                          onMouseUp={(e) => {
                            (e.currentTarget as HTMLElement).style.transform = "translateY(0px)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.transform = "translateY(0px)";
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-cyan-600" />
                          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.15] to-transparent" />
                          <div className="relative px-6 py-4 flex items-center justify-center gap-2.5">
                            {subscribeMutation.isPending ? (
                              <Loader2 className="w-5 h-5 animate-spin text-white" />
                            ) : (
                              <Sparkles className="w-4 h-4 text-white/80" />
                            )}
                            <span className="text-[15px] font-semibold text-white">
                              {subscribeMutation.isPending ? "Subscribing..." : "Subscribe Now"}
                            </span>
                            {!subscribeMutation.isPending && <ArrowRight className="w-4 h-4 text-white/60" />}
                          </div>
                        </div>
                        <div
                          className="absolute inset-x-0 -bottom-[3px] h-[6px] bg-gradient-to-r from-emerald-800 via-emerald-700 to-cyan-800 rounded-b-xl"
                          style={{
                            clipPath: "polygon(1% 0%, 99% 0%, 100% 100%, 0% 100%)",
                          }}
                        />
                      </button>

                      <div className="flex items-center justify-center gap-4 pt-3">
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                          <Shield className="w-3 h-3" />
                          <span>No spam</span>
                        </div>
                        <div className="w-px h-3 bg-white/[0.06]" />
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                          <Mail className="w-3 h-3" />
                          <span>Email via Resend</span>
                        </div>
                        <div className="w-px h-3 bg-white/[0.06]" />
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                          <Phone className="w-3 h-3" />
                          <span>SMS via Twilio</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="border-t border-white/[0.06]">
          <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-gray-600">
            <span>&copy; {new Date().getFullYear()} AI Powered Sites</span>
            <div className="flex items-center gap-4">
              <a href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-gray-400 transition-colors">Terms</a>
              <a href="/tips" className="hover:text-gray-400 transition-colors">Tips</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
