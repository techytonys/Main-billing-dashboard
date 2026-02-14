import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  Calculator, Plus, Minus, Copy, Check, Sparkles,
  Globe, ShoppingCart, Briefcase, Layout, Palette,
  FileText, RotateCcw, Send, Trash2, PlusCircle,
  Save, Mail, ExternalLink, Loader2, User,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BillingRate } from "@shared/schema";

interface QuoteLine {
  rateId: string;
  quantity: number;
}

interface CustomLine {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface ProjectTemplate {
  name: string;
  description: string;
  icon: typeof Globe;
  lines: { rateCode: string; suggestedQty: number; note: string }[];
}

const projectTemplates: ProjectTemplate[] = [
  {
    name: "Simple Landing Page",
    description: "Single page website with contact form",
    icon: Layout,
    lines: [
      { rateCode: "page_design", suggestedQty: 1, note: "1 page layout" },
      { rateCode: "image_asset", suggestedQty: 3, note: "Hero + 2 section images" },
      { rateCode: "revision", suggestedQty: 2, note: "2 rounds of changes" },
    ],
  },
  {
    name: "Business Website",
    description: "Multi-page site (Home, About, Services, Contact)",
    icon: Briefcase,
    lines: [
      { rateCode: "page_design", suggestedQty: 5, note: "Home, About, Services, Contact, FAQ" },
      { rateCode: "image_asset", suggestedQty: 10, note: "Hero images + section graphics" },
      { rateCode: "revision", suggestedQty: 3, note: "3 rounds of changes" },
    ],
  },
  {
    name: "E-Commerce Store",
    description: "Online store with product pages and checkout",
    icon: ShoppingCart,
    lines: [
      { rateCode: "page_design", suggestedQty: 8, note: "Home, Shop, Product, Cart, Checkout, About, Contact, FAQ" },
      { rateCode: "image_asset", suggestedQty: 15, note: "Product photos + banners" },
      { rateCode: "revision", suggestedQty: 4, note: "4 rounds of changes" },
    ],
  },
  {
    name: "Portfolio / Creative",
    description: "Showcase work with gallery and case studies",
    icon: Palette,
    lines: [
      { rateCode: "page_design", suggestedQty: 4, note: "Home, Portfolio, About, Contact" },
      { rateCode: "image_asset", suggestedQty: 8, note: "Gallery images + hero" },
      { rateCode: "revision", suggestedQty: 2, note: "2 rounds of changes" },
    ],
  },
];

let customIdCounter = 0;

function QuoteBuilderSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-1" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full mb-3" />
        ))}
      </Card>
    </div>
  );
}

export default function QuoteBuilder() {
  usePageTitle("Quote Builder");
  const { toast } = useToast();
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [customLines, setCustomLines] = useState<CustomLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);
  const [savedQuoteToken, setSavedQuoteToken] = useState<string | null>(null);
  const [quoteSent, setQuoteSent] = useState(false);

  const { data: rates, isLoading } = useQuery<BillingRate[]>({
    queryKey: ["/api/billing-rates"],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const allLineItems = [
        ...lines.filter(l => l.quantity > 0).map(l => {
          const rate = getRate(l.rateId);
          return {
            description: rate?.name || "Unknown",
            quantity: l.quantity,
            unitPriceCents: rate?.rateCents || 0,
          };
        }),
        ...customLines.filter(l => l.name && l.quantity > 0 && l.price > 0).map(l => ({
          description: l.name,
          quantity: l.quantity,
          unitPriceCents: l.price,
        })),
      ];
      const res = await apiRequest("POST", "/api/quotes", {
        customerName,
        customerEmail,
        lineItems: allLineItems,
        notes: quoteNotes || null,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setSavedQuoteId(data.id);
      setSavedQuoteToken(data.viewToken);
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Quote saved", description: `${data.quoteNumber} is ready to send.` });
    },
    onError: () => {
      toast({ title: "Failed to save quote", variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/quotes/${savedQuoteId}/send`, {});
      return res.json();
    },
    onSuccess: () => {
      setQuoteSent(true);
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Quote sent", description: `Email sent to ${customerEmail}` });
    },
    onError: () => {
      toast({ title: "Failed to send quote", description: "Check your email configuration.", variant: "destructive" });
    },
  });

  const activeRates = useMemo(() => rates?.filter(r => r.isActive) || [], [rates]);

  const getRate = (id: string) => activeRates.find(r => r.id === id);
  const getRateByCode = (code: string) => activeRates.find(r => r.code === code);

  const updateQuantity = (rateId: string, qty: number) => {
    if (qty <= 0) {
      setLines(prev => prev.filter(l => l.rateId !== rateId));
    } else {
      setLines(prev => {
        const existing = prev.find(l => l.rateId === rateId);
        if (existing) {
          return prev.map(l => l.rateId === rateId ? { ...l, quantity: qty } : l);
        }
        return [...prev, { rateId, quantity: qty }];
      });
    }
  };

  const getQuantity = (rateId: string) => lines.find(l => l.rateId === rateId)?.quantity || 0;

  const lineTotal = (rateId: string) => {
    const rate = getRate(rateId);
    const qty = getQuantity(rateId);
    return rate ? (rate.rateCents * qty) : 0;
  };

  const addCustomLine = () => {
    customIdCounter++;
    setCustomLines(prev => [...prev, { id: `custom-${customIdCounter}`, name: "", price: 0, quantity: 1 }]);
  };

  const updateCustomLine = (id: string, field: keyof CustomLine, value: string | number) => {
    setCustomLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeCustomLine = (id: string) => {
    setCustomLines(prev => prev.filter(l => l.id !== id));
  };

  const customTotal = useMemo(() => {
    return customLines.reduce((sum, l) => sum + (l.price * l.quantity), 0);
  }, [customLines]);

  const rateTotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      const rate = getRate(l.rateId);
      return sum + (rate ? rate.rateCents * l.quantity : 0);
    }, 0);
  }, [lines, activeRates]);

  const grandTotal = rateTotal + customTotal;

  const hasItems = lines.length > 0 || customLines.some(l => l.name && l.quantity > 0);

  const applyTemplate = (template: ProjectTemplate) => {
    const newLines: QuoteLine[] = [];
    template.lines.forEach(tl => {
      const rate = getRateByCode(tl.rateCode);
      if (rate) {
        newLines.push({ rateId: rate.id, quantity: tl.suggestedQty });
      }
    });
    setLines(newLines);
    toast({ title: `"${template.name}" template applied`, description: "Adjust quantities as needed." });
  };

  const resetQuote = () => {
    setLines([]);
    setCustomLines([]);
    setCustomerName("");
    setCustomerEmail("");
    setQuoteNotes("");
    setSavedQuoteId(null);
    setSavedQuoteToken(null);
    setQuoteSent(false);
  };

  const copyQuoteText = () => {
    const header = customerName ? `Quote for: ${customerName}\n` : "Quote Estimate\n";
    const rateItems = lines
      .filter(l => l.quantity > 0)
      .map(l => {
        const rate = getRate(l.rateId);
        if (!rate) return "";
        return `${rate.name}: ${l.quantity} ${rate.unitLabel}${l.quantity > 1 ? "s" : ""} x ${formatCurrency(rate.rateCents)} = ${formatCurrency(rate.rateCents * l.quantity)}`;
      })
      .filter(Boolean);
    const customItems = customLines
      .filter(l => l.name && l.quantity > 0)
      .map(l => `${l.name}: ${l.quantity} x ${formatCurrency(l.price)} = ${formatCurrency(l.price * l.quantity)}`);
    const allItems = [...rateItems, ...customItems].join("\n");
    const total = `\nTotal: ${formatCurrency(grandTotal)}`;
    const text = header + "---\n" + allItems + "\n---" + total;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Quote copied to clipboard" });
  };

  if (isLoading) return <QuoteBuilderSkeleton />;

  if (activeRates.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Quote Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">Set up your billing rates first to start building quotes.</p>
        </div>
        <Card className="p-8 text-center">
          <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">You need billing rates before you can build quotes.</p>
          <a href="/admin/billing-rates">
            <Button data-testid="button-go-to-rates">Set Up Billing Rates</Button>
          </a>
        </Card>
      </div>
    );
  }

  const hasMatchingRates = projectTemplates.some(t =>
    t.lines.some(tl => getRateByCode(tl.rateCode))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Quote Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quickly estimate project costs using your billing rates
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={resetQuote} data-testid="button-reset-quote">
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Reset
          </Button>
          {hasItems && (
            <Button onClick={copyQuoteText} data-testid="button-copy-quote">
              {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copied ? "Copied" : "Copy Quote"}
            </Button>
          )}
        </div>
      </div>

      {hasMatchingRates && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Quick Start Templates</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {projectTemplates.map((template) => {
              const matchCount = template.lines.filter(tl => getRateByCode(tl.rateCode)).length;
              if (matchCount === 0) return null;
              const estimatedTotal = template.lines.reduce((sum, tl) => {
                const rate = getRateByCode(tl.rateCode);
                return sum + (rate ? rate.rateCents * tl.suggestedQty : 0);
              }, 0);
              return (
                <Card
                  key={template.name}
                  className="p-4 cursor-pointer hover-elevate"
                  onClick={() => applyTemplate(template)}
                  data-testid={`template-${template.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 shrink-0">
                      <template.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight">{template.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{template.description}</p>
                      <p className="text-sm font-semibold text-primary mt-2" data-testid={`text-template-estimate-${template.name.toLowerCase().replace(/\s+/g, "-")}`}>
                        ~{formatCurrency(estimatedTotal)}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Customer Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="customer-name" className="text-xs text-muted-foreground mb-1.5 block">Customer Name *</Label>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John's Bakery"
                  data-testid="input-customer-name"
                  disabled={!!savedQuoteId}
                />
              </div>
              <div>
                <Label htmlFor="customer-email" className="text-xs text-muted-foreground mb-1.5 block">Customer Email *</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. john@bakery.com"
                  data-testid="input-customer-email"
                  disabled={!!savedQuoteId}
                />
              </div>
            </div>
            <div className="mt-3">
              <Label htmlFor="quote-notes" className="text-xs text-muted-foreground mb-1.5 block">Notes (optional)</Label>
              <Textarea
                id="quote-notes"
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                placeholder="Any additional details, timelines, or special terms..."
                rows={2}
                data-testid="textarea-quote-notes"
                disabled={!!savedQuoteId}
              />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Line Items</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Your Services</p>
            <div className="space-y-3">
              {activeRates.map((rate) => {
                const qty = getQuantity(rate.id);
                const total = lineTotal(rate.id);
                return (
                  <div
                    key={rate.id}
                    className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${qty > 0 ? "bg-primary/5 border-primary/20" : "bg-muted/30"}`}
                    data-testid={`quote-line-${rate.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{rate.name}</p>
                        <Badge variant="secondary" className="text-[10px]">{formatCurrency(rate.rateCents)} / {rate.unitLabel}</Badge>
                      </div>
                      {rate.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{rate.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateQuantity(rate.id, qty - 1)}
                        disabled={qty === 0}
                        data-testid={`button-decrease-${rate.id}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        value={qty}
                        onChange={(e) => updateQuantity(rate.id, parseInt(e.target.value) || 0)}
                        className="w-16 text-center"
                        data-testid={`input-quantity-${rate.id}`}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateQuantity(rate.id, qty + 1)}
                        data-testid={`button-increase-${rate.id}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="w-24 text-right shrink-0">
                      <p className={`text-sm font-semibold ${qty > 0 ? "" : "text-muted-foreground"}`} data-testid={`text-line-total-${rate.id}`}>
                        {qty > 0 ? formatCurrency(total) : "-"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator className="my-5" />

            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custom Items</p>
              <Button variant="outline" size="sm" onClick={addCustomLine} data-testid="button-add-custom-item">
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                Add Item
              </Button>
            </div>

            {customLines.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Add one-off items that aren't in your standard rates (e.g. "Domain Registration", "Premium Plugin")
              </p>
            ) : (
              <div className="space-y-3">
                {customLines.map((cl) => (
                  <div
                    key={cl.id}
                    className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${cl.name && cl.quantity > 0 ? "bg-primary/5 border-primary/20" : "bg-muted/30"}`}
                    data-testid={`custom-line-${cl.id}`}
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <Input
                        placeholder="Item name"
                        value={cl.name}
                        onChange={(e) => updateCustomLine(cl.id, "name", e.target.value)}
                        className="flex-1 min-w-[120px]"
                        data-testid={`input-custom-name-${cl.id}`}
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Price"
                          value={cl.price > 0 ? (cl.price / 100).toFixed(2) : ""}
                          onChange={(e) => updateCustomLine(cl.id, "price", Math.round(parseFloat(e.target.value || "0") * 100))}
                          className="w-24"
                          data-testid={`input-custom-price-${cl.id}`}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateCustomLine(cl.id, "quantity", Math.max(0, cl.quantity - 1))}
                        disabled={cl.quantity === 0}
                        data-testid={`button-custom-decrease-${cl.id}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        value={cl.quantity}
                        onChange={(e) => updateCustomLine(cl.id, "quantity", parseInt(e.target.value) || 0)}
                        className="w-16 text-center"
                        data-testid={`input-custom-quantity-${cl.id}`}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateCustomLine(cl.id, "quantity", cl.quantity + 1)}
                        data-testid={`button-custom-increase-${cl.id}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-24 text-right">
                        <p className={`text-sm font-semibold ${cl.price > 0 && cl.quantity > 0 ? "" : "text-muted-foreground"}`} data-testid={`text-custom-total-${cl.id}`}>
                          {cl.price > 0 && cl.quantity > 0 ? formatCurrency(cl.price * cl.quantity) : "-"}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeCustomLine(cl.id)}
                        data-testid={`button-remove-custom-${cl.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card className="p-5 sticky top-20 z-[999]">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Quote Summary</span>
            </div>
            {customerName && (
              <p className="text-xs text-muted-foreground mb-3">For: <span className="font-medium text-foreground">{customerName}</span></p>
            )}
            {!hasItems ? (
              <div className="text-center py-6">
                <Calculator className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Add items or pick a template to get started</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {lines.filter(l => l.quantity > 0).map((l) => {
                    const rate = getRate(l.rateId);
                    if (!rate) return null;
                    return (
                      <div key={l.rateId} className="flex items-center justify-between gap-2 text-xs" data-testid={`summary-line-${l.rateId}`}>
                        <span className="text-muted-foreground truncate">
                          {rate.name} x {l.quantity}
                        </span>
                        <span className="font-medium shrink-0">
                          {formatCurrency(rate.rateCents * l.quantity)}
                        </span>
                      </div>
                    );
                  })}
                  {customLines.filter(l => l.name && l.quantity > 0 && l.price > 0).map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-2 text-xs" data-testid={`summary-custom-${l.id}`}>
                      <span className="text-muted-foreground truncate">
                        {l.name} x {l.quantity}
                      </span>
                      <span className="font-medium shrink-0">
                        {formatCurrency(l.price * l.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <Separator className="mb-3" />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-lg font-bold text-primary" data-testid="text-grand-total">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {!savedQuoteId ? (
                    <>
                      <Button
                        className="w-full"
                        onClick={() => saveMutation.mutate()}
                        disabled={!customerName || !customerEmail || saveMutation.isPending}
                        data-testid="button-save-quote"
                      >
                        {saveMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-1.5" />
                        )}
                        {saveMutation.isPending ? "Saving..." : "Save & Prepare Quote"}
                      </Button>
                      {(!customerName || !customerEmail) && (
                        <p className="text-[10px] text-muted-foreground text-center">Enter customer name & email to save</p>
                      )}
                    </>
                  ) : !quoteSent ? (
                    <>
                      <Button
                        className="w-full"
                        onClick={() => sendMutation.mutate()}
                        disabled={sendMutation.isPending}
                        data-testid="button-send-quote"
                      >
                        {sendMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4 mr-1.5" />
                        )}
                        {sendMutation.isPending ? "Sending..." : "Send Quote to Customer"}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          const url = `${window.location.origin}/quote/${savedQuoteToken}`;
                          navigator.clipboard.writeText(url);
                          toast({ title: "Quote link copied" });
                        }}
                        data-testid="button-copy-quote-link"
                      >
                        <ExternalLink className="w-4 h-4 mr-1.5" />
                        Copy Quote Link
                      </Button>
                    </>
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 text-emerald-600">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Quote Sent</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(`/quote/${savedQuoteToken}`, "_blank")}
                        data-testid="button-view-quote"
                      >
                        <ExternalLink className="w-4 h-4 mr-1.5" />
                        Preview Quote Page
                      </Button>
                    </div>
                  )}
                  <Button variant="outline" className="w-full" onClick={copyQuoteText} data-testid="button-copy-summary">
                    {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                    {copied ? "Copied" : "Copy as Text"}
                  </Button>
                </div>
              </>
            )}
          </Card>

          <Card className="p-5 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Estimation Tips</span>
            </div>
            <div className="space-y-3 text-xs text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-0.5">Pages</p>
                <p>Count each unique layout. Home, About, Contact, Services = 4 pages. Blog listing + blog post = 2 more.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-0.5">Images / Assets</p>
                <p>Each hero banner, custom graphic, or edited photo counts as 1. Stock photos that need editing count too.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-0.5">Revisions</p>
                <p>Include 2-3 rounds for most clients. Larger or pickier projects may need 4-5.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-0.5">E-Commerce</p>
                <p>Product page, cart, checkout, account pages = ~4 extra pages minimum. Add more for complex catalogs.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-0.5">Custom Items</p>
                <p>Use "Add Item" for one-off costs like domain registration ($15), premium plugins ($50-200), or third-party subscriptions.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
