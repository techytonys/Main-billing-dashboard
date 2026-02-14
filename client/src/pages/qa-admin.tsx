import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  MessageSquare, Search, Trash2, Loader2, Clock, Send,
  CheckCircle2, CircleDot, Eye, EyeOff, ArrowLeft, Save,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePageTitle } from "@/hooks/use-page-title";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { QaQuestion } from "@shared/schema";

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function AnswerEditor({
  question,
  onClose,
}: {
  question: QaQuestion;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [answer, setAnswer] = useState(question.answer || "");
  const [isPublic, setIsPublic] = useState(question.isPublic ?? true);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/qa/questions/${question.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa/questions"] });
      toast({ title: "Answer saved" });
      onClose();
    },
    onError: () => toast({ title: "Failed to save answer", variant: "destructive" }),
  });

  function handleSave() {
    const status = answer.trim() ? "answered" : "unanswered";
    updateMutation.mutate({ answer: answer.trim(), status, isPublic });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-back-questions">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-semibold" data-testid="text-answer-editor-title">
          Answer Question
        </h2>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPublic(!isPublic)}
            data-testid="button-toggle-visibility"
          >
            {isPublic ? <Eye className="w-4 h-4 mr-1.5" /> : <EyeOff className="w-4 h-4 mr-1.5" />}
            {isPublic ? "Public" : "Hidden"}
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-answer">
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="ml-2">Save</span>
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
          <span className="font-medium">{question.authorName}</span>
          <span>&middot;</span>
          <span>{question.authorEmail}</span>
          <span>&middot;</span>
          <Clock className="w-3 h-3" />
          <span>{formatDate(question.createdAt)}</span>
        </div>
        <p className="text-foreground whitespace-pre-wrap" data-testid="text-question-content">{question.question}</p>
      </Card>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Your Answer</label>
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Write your answer here..."
          rows={10}
          className="text-sm"
          data-testid="input-answer-content"
        />
      </div>
    </div>
  );
}

export default function QaAdmin() {
  usePageTitle("Q&A");
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [answeringQuestion, setAnsweringQuestion] = useState<QaQuestion | null>(null);
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);

  const { data: questions, isLoading } = useQuery<QaQuestion[]>({
    queryKey: ["/api/qa/questions"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/qa/questions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa/questions"] });
      toast({ title: "Question deleted" });
      setDeleteDialogId(null);
    },
    onError: () => toast({ title: "Failed to delete question", variant: "destructive" }),
  });

  if (answeringQuestion) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <AnswerEditor
          question={answeringQuestion}
          onClose={() => setAnsweringQuestion(null)}
        />
      </div>
    );
  }

  const filtered = (questions || []).filter((q) => {
    const matchesSearch = !searchQuery ||
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const unansweredCount = (questions || []).filter((q) => q.status === "unanswered").length;
  const answeredCount = (questions || []).filter((q) => q.status === "answered").length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-page-title">Q&A</h1>
            <p className="text-sm text-muted-foreground" data-testid="text-question-count">
              {unansweredCount} unanswered, {answeredCount} answered
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions..."
            className="pl-9"
            data-testid="input-search-questions"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Questions</SelectItem>
            <SelectItem value="unanswered">Unanswered</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-2/3 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-1/3" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground font-medium" data-testid="text-empty-state">
            {searchQuery || statusFilter !== "all" ? "No questions match your filters" : "No questions yet"}
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Questions submitted by visitors will appear here for you to answer.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <Card
              key={q.id}
              className="p-4 hover-elevate cursor-pointer"
              onClick={() => setAnsweringQuestion(q)}
              data-testid={`card-question-${q.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge
                      variant={q.status === "answered" ? "default" : "secondary"}
                      className="text-xs no-default-active-elevate"
                      data-testid={`badge-status-${q.id}`}
                    >
                      {q.status === "answered" ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" /> Answered</>
                      ) : (
                        <><CircleDot className="w-3 h-3 mr-1" /> Unanswered</>
                      )}
                    </Badge>
                    {!q.isPublic && (
                      <Badge variant="outline" className="text-xs no-default-active-elevate">
                        <EyeOff className="w-3 h-3 mr-1" /> Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="text-foreground line-clamp-2 mb-1" data-testid={`text-question-${q.id}`}>
                    {q.question}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/70 flex-wrap">
                    <span>{q.authorName}</span>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(q.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAnsweringQuestion(q)}
                    data-testid={`button-answer-${q.id}`}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteDialogId(q.id)}
                    data-testid={`button-delete-${q.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteDialogId} onOpenChange={() => setDeleteDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogId(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialogId && deleteMutation.mutate(deleteDialogId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
