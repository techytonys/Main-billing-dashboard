import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useRoute } from "wouter";
import {
  CheckCircle2, XCircle, MessageSquare, Send, Clock,
  FileText, ArrowRight, Sparkles, AlertCircle, ClipboardList, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/format";
import type { Quote, QuoteLineItem, QuoteComment } from "@shared/schema";

interface QuoteData extends Quote {
  lineItems: QuoteLineItem[];
  comments: QuoteComment[];
}

function QuoteViewSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card className="p-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function statusBadge(status: string) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Draft", variant: "secondary" },
    sent: { label: "Awaiting Response", variant: "outline" },
    approved: { label: "Approved", variant: "default" },
    declined: { label: "Declined", variant: "destructive" },
  };
  const c = config[status] || { label: status, variant: "secondary" };
  return <Badge variant={c.variant} data-testid="badge-quote-status">{c.label}</Badge>;
}

export default function QuoteView() {
  const [, params] = useRoute("/quote/:token");
  const token = params?.token;
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [responseComment, setResponseComment] = useState("");
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [requirements, setRequirements] = useState("");

  const { data: quote, isLoading, error } = useQuery<QuoteData>({
    queryKey: ["/api/public/quotes", token],
    queryFn: () => fetch(`/api/public/quotes/${token}`).then(r => {
      if (!r.ok) throw new Error("Quote not found");
      return r.json();
    }),
    enabled: !!token,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ action, comment }: { action: string; comment?: string }) => {
      const res = await apiRequest("POST", `/api/public/quotes/${token}/respond`, { action, comment });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/quotes", token] });
      toast({
        title: variables.action === "approve" ? "Quote Approved" : "Quote Declined",
        description: variables.action === "approve"
          ? "Thank you! We'll get started on your project soon."
          : "We've noted your response. Feel free to leave any feedback below.",
      });
      setShowDeclineForm(false);
      setResponseComment("");
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", `/api/public/quotes/${token}/comments`, { message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/quotes", token] });
      setComment("");
      toast({ title: "Comment sent", description: "We'll review your message and get back to you." });
    },
    onError: () => {
      toast({ title: "Failed to send comment", variant: "destructive" });
    },
  });

  const requirementsMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", `/api/public/quotes/${token}/requirements`, { requirements: text });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/quotes", token] });
      setRequirements("");
      toast({ title: "Requirements submitted", description: "We've received your project details and will be in touch soon." });
    },
    onError: () => {
      toast({ title: "Failed to submit requirements", variant: "destructive" });
    },
  });

  if (isLoading) return <QuoteViewSkeleton />;

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Quote Not Found</h2>
          <p className="text-sm text-muted-foreground">This quote link may have expired or doesn't exist.</p>
        </Card>
      </div>
    );
  }

  const canRespond = quote.status === "sent";
  const isResolved = quote.status === "approved" || quote.status === "declined";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-emerald-500/10">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" data-testid="text-quote-title">Project Quote</h1>
            <p className="text-xs text-muted-foreground">{quote.quoteNumber}</p>
          </div>
        </div>

        <Card className="mt-6 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 px-6 py-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-white text-sm font-semibold">AI Powered Sites</p>
                <p className="text-slate-400 text-xs mt-0.5">hello@aipoweredsites.com</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 text-lg font-extrabold tracking-tight" data-testid="text-quote-number">{quote.quoteNumber}</p>
                {statusBadge(quote.status)}
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Prepared For</p>
                <p className="text-sm font-semibold mt-1" data-testid="text-customer-name">{quote.customerName}</p>
                <p className="text-xs text-muted-foreground">{quote.customerEmail}</p>
              </div>
              {quote.createdAt && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Date</p>
                  <p className="text-sm font-medium mt-1">
                    {new Date(quote.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-md border overflow-hidden">
              <div className="grid grid-cols-12 bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              {quote.lineItems.map((item, i) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-12 px-4 py-3 text-sm items-center ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                  data-testid={`quote-line-item-${i}`}
                >
                  <div className="col-span-6 font-medium">{item.description}</div>
                  <div className="col-span-2 text-center text-muted-foreground">{item.quantity}</div>
                  <div className="col-span-2 text-right text-muted-foreground">{formatCurrency(item.unitPriceCents)}</div>
                  <div className="col-span-2 text-right font-semibold">{formatCurrency(item.totalCents)}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-4">
              <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-md px-6 py-4 min-w-[200px]">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-xl font-extrabold tracking-tight" data-testid="text-quote-total">
                    {formatCurrency(quote.totalAmountCents)}
                  </span>
                </div>
              </div>
            </div>

            {quote.notes && (
              <div className="mt-6 p-4 bg-muted/30 rounded-md">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}
          </div>
        </Card>

        {canRespond && !showDeclineForm && (
          <Card className="mt-6 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Your Response</span>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Review the quote above and let us know how you'd like to proceed. You can also leave comments below.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => respondMutation.mutate({ action: "approve" })}
                disabled={respondMutation.isPending}
                data-testid="button-approve-quote"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve Quote
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeclineForm(true)}
                disabled={respondMutation.isPending}
                data-testid="button-decline-quote"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Request Changes
              </Button>
            </div>
          </Card>
        )}

        {canRespond && showDeclineForm && (
          <Card className="mt-6 p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Let Us Know What to Change</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Tell us what you'd like adjusted - pricing, scope, timeline, or anything else.
            </p>
            <Textarea
              value={responseComment}
              onChange={(e) => setResponseComment(e.target.value)}
              placeholder="e.g. Can we work on pricing for the image assets? Also wondering if we could add an extra revision round..."
              className="mb-4"
              rows={4}
              data-testid="textarea-decline-comment"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowDeclineForm(false); setResponseComment(""); }}
                data-testid="button-cancel-decline"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => respondMutation.mutate({ action: "deny", comment: responseComment })}
                disabled={respondMutation.isPending}
                data-testid="button-submit-decline"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Submit Feedback
              </Button>
            </div>
          </Card>
        )}

        {isResolved && (
          <Card className="mt-6 p-6">
            <div className="flex items-center gap-3">
              {quote.status === "approved" ? (
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/10">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold">
                  {quote.status === "approved" ? "Quote Approved" : "Changes Requested"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {quote.status === "approved"
                    ? "Thank you! Please share your project requirements below so we can get started."
                    : "We've received your feedback and will follow up shortly."}
                </p>
              </div>
            </div>
          </Card>
        )}

        {quote.status === "approved" && (
          <Card className="mt-6 p-6">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Project Requirements</span>
            </div>
            {quote.projectRequirements ? (
              <div>
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-600">Requirements Submitted</span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-requirements">{quote.projectRequirements}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Need to add more details? Use the comments section below to share additional information.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Help us understand your vision. Tell us about your project goals, brand preferences, content you'll provide, and any specific features or pages you need.
                </p>
                <Textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder={"Share your project details here...\n\n- What is the purpose of your website?\n- Who is your target audience?\n- Do you have brand colors, logos, or style preferences?\n- What pages or features do you need?\n- Do you have content ready (text, images)?\n- Any websites you like for inspiration?\n- What's your ideal timeline?"}
                  className="mb-4"
                  rows={8}
                  data-testid="textarea-requirements"
                />
                <Button
                  className="w-full"
                  onClick={() => requirements.trim() && requirementsMutation.mutate(requirements.trim())}
                  disabled={!requirements.trim() || requirementsMutation.isPending}
                  data-testid="button-submit-requirements"
                >
                  {requirementsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {requirementsMutation.isPending ? "Submitting..." : "Submit Project Requirements"}
                </Button>
              </div>
            )}
          </Card>
        )}

        <Card className="mt-6 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Comments & Discussion</span>
          </div>

          {quote.comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No comments yet. Have a question about this quote? Start the conversation below.
            </p>
          )}

          {quote.comments.length > 0 && (
            <div className="space-y-4 mb-6">
              {quote.comments.map((c) => (
                <div
                  key={c.id}
                  className={`flex gap-3 ${c.senderType === "admin" ? "" : "flex-row-reverse"}`}
                  data-testid={`comment-${c.id}`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-xs font-bold ${
                    c.senderType === "admin"
                      ? "bg-primary/10 text-primary"
                      : "bg-emerald-500/10 text-emerald-600"
                  }`}>
                    {c.senderName.charAt(0).toUpperCase()}
                  </div>
                  <div className={`max-w-[80%] ${c.senderType === "admin" ? "" : "text-right"}`}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold">{c.senderName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {c.createdAt && new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className={`rounded-md p-3 text-sm ${
                      c.senderType === "admin"
                        ? "bg-muted/50"
                        : "bg-emerald-500/5 border border-emerald-500/20"
                    }`}>
                      {c.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator className="mb-4" />
          <div className="flex gap-3">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ask a question or leave a comment..."
              className="flex-1"
              rows={2}
              data-testid="textarea-comment"
            />
            <Button
              size="icon"
              onClick={() => comment.trim() && commentMutation.mutate(comment.trim())}
              disabled={!comment.trim() || commentMutation.isPending}
              data-testid="button-send-comment"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        <div className="text-center mt-8 pb-8">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">AI Powered Sites</span> &middot; hello@aipoweredsites.com
          </p>
        </div>
      </div>
    </div>
  );
}
