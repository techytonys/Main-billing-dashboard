import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import DOMPurify from "dompurify";
import {
  MessageSquare, Send, ChevronDown, ChevronUp, CheckCircle2,
  CircleDot, Clock, Loader2, Zap, ArrowLeft, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { QaQuestion } from "@shared/schema";

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function QuestionItem({ question }: { question: QaQuestion }) {
  const [expanded, setExpanded] = useState(false);
  const isAnswered = question.status === "answered" && question.answer;

  return (
    <div
      className="border border-white/5 rounded-md bg-white/[0.02] overflow-hidden"
      data-testid={`qa-item-${question.id}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 sm:p-5 flex items-start gap-3"
        data-testid={`button-toggle-${question.id}`}
      >
        <div className="mt-0.5 flex-shrink-0">
          {isAnswered ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <CircleDot className="w-5 h-5 text-white/30" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm sm:text-base leading-relaxed" data-testid={`text-question-${question.id}`}>
            {question.question}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-white/30 flex-wrap">
            <span>{question.authorName}</span>
            <span>&middot;</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(question.createdAt)}
            </span>
            {isAnswered && (
              <>
                <span>&middot;</span>
                <span className="text-emerald-400/70">Answered</span>
              </>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 mt-1">
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-white/30" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/30" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-white/5 p-4 sm:p-5 bg-white/[0.01]">
          {isAnswered ? (
            <div data-testid={`text-answer-${question.id}`}>
              <div className="flex items-center gap-2 mb-3 text-xs text-white/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Answered {question.answeredAt ? formatDate(question.answeredAt) : ""}</span>
              </div>
              <div className="rich-content rich-content-dark text-white/70 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(question.answer || "", { ALLOWED_TAGS: ["h1", "h2", "h3", "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li", "blockquote", "pre", "code", "span"], ALLOWED_ATTR: ["href", "target", "rel", "class", "style"] }) }} />
            </div>
          ) : (
            <p className="text-white/40 text-sm italic" data-testid={`text-pending-${question.id}`}>
              This question hasn't been answered yet. Check back soon!
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PublicQA() {
  const { toast } = useToast();
  const [askOpen, setAskOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "answered" | "unanswered">("all");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [questionText, setQuestionText] = useState("");

  const { data: questions, isLoading } = useQuery<QaQuestion[]>({
    queryKey: ["/api/public/qa/questions"],
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { authorName: string; authorEmail: string; question: string }) => {
      const res = await apiRequest("POST", "/api/public/qa/questions", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Question submitted!", description: "We'll answer your question soon." });
      setAskOpen(false);
      setName("");
      setEmail("");
      setQuestionText("");
      queryClient.invalidateQueries({ queryKey: ["/api/public/qa/questions"] });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    },
  });

  function handleSubmit() {
    if (!name.trim() || !email.trim() || !questionText.trim()) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    submitMutation.mutate({
      authorName: name.trim(),
      authorEmail: email.trim(),
      question: questionText.trim(),
    });
  }

  const filtered = (questions || []).filter((q) => {
    const matchesSearch = !searchQuery ||
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.answer && q.answer.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === "all" ||
      (filterStatus === "answered" && q.status === "answered") ||
      (filterStatus === "unanswered" && q.status === "unanswered");
    return matchesSearch && matchesStatus;
  });

  const answeredCount = (questions || []).filter(q => q.status === "answered").length;
  const totalCount = (questions || []).length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5" style={{ backdropFilter: "blur(20px)", backgroundColor: "rgba(10,10,15,0.8)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-violet-600">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-semibold tracking-tight" data-testid="text-brand-name">AI Powered Sites</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setAskOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white font-medium"
              data-testid="button-ask-question"
            >
              <Send className="w-4 h-4 mr-1.5" />
              Ask a Question
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4 sm:mb-6">
              <MessageSquare className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-white/70">Community Q&A</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-4" data-testid="text-qa-title">
              Questions &{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Answers</span>
            </h1>
            <p className="text-white/50 text-sm sm:text-lg max-w-2xl mx-auto">
              Got a question? Browse existing answers or ask your own. We're here to help.
            </p>
            {totalCount > 0 && (
              <p className="text-white/30 text-sm mt-3" data-testid="text-qa-stats">
                {totalCount} question{totalCount !== 1 ? "s" : ""} &middot; {answeredCount} answered
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions..."
                className="w-full pl-9 pr-4 py-2.5 rounded-md bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                data-testid="input-search-qa"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {(["all", "answered", "unanswered"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    filterStatus === status
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/60"
                  }`}
                  data-testid={`button-filter-${status}`}
                >
                  {status === "all" ? "All" : status === "answered" ? "Answered" : "Unanswered"}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-white/5 rounded-md p-5 bg-white/[0.02]">
                  <div className="h-5 w-3/4 bg-white/5 rounded animate-pulse mb-2" />
                  <div className="h-4 w-1/3 bg-white/5 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 border border-white/5 rounded-md bg-white/[0.02]">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-white/10" />
              <p className="text-white/40 font-medium" data-testid="text-empty-state">
                {searchQuery || filterStatus !== "all" ? "No questions match your search" : "No questions yet"}
              </p>
              <p className="text-white/20 text-sm mt-1 mb-4">Be the first to ask a question!</p>
              <Button
                onClick={() => setAskOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white"
                data-testid="button-ask-first"
              >
                <Send className="w-4 h-4 mr-1.5" />
                Ask a Question
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((q) => (
                <QuestionItem key={q.id} question={q} />
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-white/5 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/">
              <span className="text-sm text-white/30 hover:text-white/50 transition-colors cursor-pointer" data-testid="link-back-home">
                <ArrowLeft className="w-3.5 h-3.5 inline mr-1.5" />
                Back to AI Powered Sites
              </span>
            </Link>
            <p className="text-xs text-white/20">&copy; {new Date().getFullYear()} AI Powered Sites</p>
          </div>
        </footer>
      </div>

      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-violet-400" />
              Ask a Question
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Your question will be visible to everyone once submitted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm text-white/60">Your Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2.5 rounded-md bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                data-testid="input-qa-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/60">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                type="email"
                className="w-full px-3 py-2.5 rounded-md bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                data-testid="input-qa-email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/60">Your Question</label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="What would you like to know?"
                rows={4}
                className="w-full px-3 py-2.5 rounded-md bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
                data-testid="input-qa-question"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="w-full bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white font-medium"
              data-testid="button-submit-question"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit Question
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
