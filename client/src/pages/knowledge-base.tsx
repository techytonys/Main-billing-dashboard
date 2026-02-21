import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Eye, EyeOff, BookOpen, Send, FileText, Search, GripVertical } from "lucide-react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import type { KnowledgeBaseArticle } from "@shared/schema";

const DEFAULT_CATEGORIES = ["General", "Getting Started", "Billing", "Technical", "FAQ", "Tutorials", "Troubleshooting"];

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ color: [] }, { background: [] }],
    ["blockquote", "code-block"],
    ["link", "image"],
    ["clean"],
  ],
};

function stripHtml(html: string) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

export default function KnowledgeBase() {
  const { toast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeBaseArticle | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [sortOrder, setSortOrder] = useState(0);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const { data: articles = [], isLoading } = useQuery<KnowledgeBaseArticle[]>({
    queryKey: ["/api/knowledge-base"],
  });

  const allCategories = useMemo(() => {
    const fromArticles = articles.map(a => a.category).filter(Boolean);
    const merged = new Set([...DEFAULT_CATEGORIES, ...fromArticles]);
    return Array.from(merged).sort();
  }, [articles]);

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; category: string; status: string; sortOrder: number }) => {
      const res = await apiRequest("POST", "/api/knowledge-base", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      toast({ title: "Article created" });
      closeEditor();
    },
    onError: () => toast({ title: "Failed to create article", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; content?: string; category?: string; status?: string; sortOrder?: number }) => {
      const res = await apiRequest("PATCH", `/api/knowledge-base/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      toast({ title: "Article updated" });
      closeEditor();
    },
    onError: () => toast({ title: "Failed to update article", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/knowledge-base/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      toast({ title: "Article deleted" });
      setDeleteConfirm(null);
    },
  });

  const openNewEditor = () => {
    setEditingArticle(null);
    setTitle("");
    setContent("");
    setCategory("General");
    setSortOrder(0);
    setShowNewCategory(false);
    setNewCategoryName("");
    setEditorOpen(true);
  };

  const openEditEditor = (article: KnowledgeBaseArticle) => {
    setEditingArticle(article);
    setShowNewCategory(false);
    setNewCategoryName("");
    setTitle(article.title);
    setContent(article.content);
    setCategory(article.category);
    setSortOrder(article.sortOrder || 0);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingArticle(null);
  };

  const handleSaveDraft = () => {
    if (!title.trim()) return toast({ title: "Title is required", variant: "destructive" });
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, title, content, category, status: "draft", sortOrder });
    } else {
      createMutation.mutate({ title, content, category, status: "draft", sortOrder });
    }
  };

  const handlePublish = () => {
    if (!title.trim()) return toast({ title: "Title is required", variant: "destructive" });
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, title, content, category, status: "published", sortOrder });
    } else {
      createMutation.mutate({ title, content, category, status: "published", sortOrder });
    }
  };

  const togglePublish = (article: KnowledgeBaseArticle) => {
    const newStatus = article.status === "published" ? "draft" : "published";
    updateMutation.mutate({ id: article.id, status: newStatus });
  };

  const filtered = articles.filter((a) => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterCategory !== "all" && a.category !== filterCategory) return false;
    if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const draftCount = articles.filter((a) => a.status === "draft").length;
  const publishedCount = articles.filter((a) => a.status === "published").length;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" data-testid="page-knowledge-base">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-kb-title">
            <BookOpen className="w-6 h-6" /> Knowledge Base
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Create and manage help articles. Published articles sync to Notion and appear on the public /help page.</p>
        </div>
        <Button onClick={openNewEditor} data-testid="button-new-article">
          <Plus className="w-4 h-4 mr-2" /> New Article
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={filterStatus === "all" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilterStatus("all")} data-testid="filter-all">
          All ({articles.length})
        </Badge>
        <Badge variant={filterStatus === "draft" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilterStatus("draft")} data-testid="filter-draft">
          Drafts ({draftCount})
        </Badge>
        <Badge variant={filterStatus === "published" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilterStatus("published")} data-testid="filter-published">
          Published ({publishedCount})
        </Badge>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search articles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" data-testid="input-search-articles" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allCategories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading articles...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No articles found. Create your first knowledge base article!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((article) => (
            <Card key={article.id} className="hover:shadow-md transition-shadow" data-testid={`card-article-${article.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-1 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate" data-testid={`text-article-title-${article.id}`}>{article.title}</h3>
                        <Badge variant={article.status === "published" ? "default" : "secondary"} className="text-xs" data-testid={`badge-status-${article.id}`}>
                          {article.status === "published" ? "Published" : "Draft"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{article.category}</Badge>
                        {article.notionPageId && (
                          <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">Notion</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {article.content ? stripHtml(article.content).substring(0, 150) + (stripHtml(article.content).length > 150 ? "..." : "") : "No content yet"}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Updated {article.updatedAt ? new Date(article.updatedAt).toLocaleDateString() : "—"} · /{article.slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => togglePublish(article)} title={article.status === "published" ? "Unpublish" : "Publish"} data-testid={`button-toggle-publish-${article.id}`}>
                      {article.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditEditor(article)} data-testid={`button-edit-article-${article.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteConfirm(article.id)} data-testid={`button-delete-article-${article.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-editor-title">{editingArticle ? "Edit Article" : "New Article"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title..." data-testid="input-article-title" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>Category</Label>
                {showNewCategory ? (
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Type new category name..."
                      autoFocus
                      data-testid="input-new-category"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newCategoryName.trim()) {
                          setCategory(newCategoryName.trim());
                          setShowNewCategory(false);
                          setNewCategoryName("");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={!newCategoryName.trim()}
                      onClick={() => {
                        setCategory(newCategoryName.trim());
                        setShowNewCategory(false);
                        setNewCategoryName("");
                      }}
                      data-testid="button-save-category"
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }}
                      data-testid="button-cancel-category"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={category}
                    onValueChange={(val) => {
                      if (val === "__new__") {
                        setShowNewCategory(true);
                      } else {
                        setCategory(val);
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-article-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                      <SelectItem value="__new__" className="text-primary font-medium border-t mt-1 pt-1">
                        + New Category
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="w-24">
                <Label>Sort Order</Label>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} data-testid="input-sort-order" />
              </div>
            </div>
            <div>
              <Label>Content</Label>
              <div className="mt-1 rounded-md border bg-background" data-testid="editor-quill-wrapper">
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={quillModules}
                  placeholder="Write your article content here..."
                  style={{ minHeight: "300px" }}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={closeEditor} data-testid="button-cancel-editor">Cancel</Button>
            <Button variant="secondary" onClick={handleSaveDraft} disabled={isPending} data-testid="button-save-draft">
              <FileText className="w-4 h-4 mr-2" /> Save as Draft
            </Button>
            <Button onClick={handlePublish} disabled={isPending} data-testid="button-publish">
              <Send className="w-4 h-4 mr-2" /> {editingArticle?.status === "published" ? "Update & Publish" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Article</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this article? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
