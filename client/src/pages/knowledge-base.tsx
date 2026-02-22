import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, BookOpen, Send, FileText, Search, GripVertical,
  Folder, Rocket, CreditCard, Settings, HelpCircle, GraduationCap, Wrench,
  Tag, Heart, Star, Zap, Shield, Globe, Code, Lightbulb, MessageCircle, Users, Clock, CheckCircle,
  AlertTriangle, Info, Database, Layout, Smartphone, Monitor, Palette, X
} from "lucide-react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import type { KnowledgeBaseArticle, KnowledgeBaseCategory, KnowledgeBaseTag } from "@shared/schema";

const ICON_MAP: Record<string, any> = {
  Folder, Rocket, CreditCard, Settings, HelpCircle, GraduationCap, Wrench,
  Tag, Heart, Star, Zap, Shield, Globe, Code, Lightbulb, MessageCircle, Users, Clock, CheckCircle,
  AlertTriangle, Info, Database, Layout, Smartphone, Monitor, Palette, BookOpen, FileText, Search,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

const TAG_COLORS = [
  { name: "gray", bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300", border: "border-gray-300 dark:border-gray-600" },
  { name: "blue", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-300 dark:border-blue-600" },
  { name: "green", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", border: "border-green-300 dark:border-green-600" },
  { name: "red", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", border: "border-red-300 dark:border-red-600" },
  { name: "purple", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", border: "border-purple-300 dark:border-purple-600" },
  { name: "yellow", bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-300 dark:border-yellow-600" },
  { name: "pink", bg: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-700 dark:text-pink-300", border: "border-pink-300 dark:border-pink-600" },
  { name: "indigo", bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-300 dark:border-indigo-600" },
  { name: "teal", bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-700 dark:text-teal-300", border: "border-teal-300 dark:border-teal-600" },
  { name: "orange", bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", border: "border-orange-300 dark:border-orange-600" },
];

function getTagColor(colorName: string) {
  return TAG_COLORS.find(c => c.name === colorName) || TAG_COLORS[0];
}

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = ICON_MAP[name];
  if (!IconComponent) return <Folder className={className} />;
  return <IconComponent className={className} />;
}

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setOpen(!open)} data-testid="button-icon-picker">
        <DynamicIcon name={value} className="w-4 h-4" />
        <span className="text-xs">{value}</span>
      </Button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-background border rounded-lg shadow-lg p-2 grid grid-cols-6 gap-1 w-[240px]" data-testid="icon-picker-grid">
          {ICON_OPTIONS.map(iconName => (
            <button
              key={iconName}
              type="button"
              className={`p-2 rounded hover:bg-accent flex items-center justify-center ${value === iconName ? "bg-accent ring-2 ring-primary" : ""}`}
              onClick={() => { onChange(iconName); setOpen(false); }}
              title={iconName}
              data-testid={`icon-option-${iconName}`}
            >
              <DynamicIcon name={iconName} className="w-4 h-4" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState("articles");
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
  const [articleTags, setArticleTags] = useState<string[]>([]);

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<KnowledgeBaseCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("Folder");
  const [catSortOrder, setCatSortOrder] = useState(0);
  const [deleteCatConfirm, setDeleteCatConfirm] = useState<string | null>(null);

  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<KnowledgeBaseTag | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagIcon, setTagIcon] = useState("Tag");
  const [tagColor, setTagColor] = useState("gray");
  const [deleteTagConfirm, setDeleteTagConfirm] = useState<string | null>(null);

  const { data: articles = [], isLoading } = useQuery<KnowledgeBaseArticle[]>({
    queryKey: ["/api/knowledge-base"],
  });

  const { data: categories = [] } = useQuery<KnowledgeBaseCategory[]>({
    queryKey: ["/api/knowledge-base/categories/list"],
  });

  const { data: tags = [] } = useQuery<KnowledgeBaseTag[]>({
    queryKey: ["/api/knowledge-base/tags/list"],
  });

  const allCategoryNames = useMemo(() => {
    return categories.map(c => c.name);
  }, [categories]);

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; category: string; status: string; sortOrder: number; tags: string[] }) => {
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
    mutationFn: async ({ id, ...data }: { id: string; title?: string; content?: string; category?: string; status?: string; sortOrder?: number; tags?: string[] }) => {
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

  const createCatMutation = useMutation({
    mutationFn: async (data: { name: string; icon: string; sortOrder: number }) => {
      const res = await apiRequest("POST", "/api/knowledge-base/categories", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/categories/list"] });
      toast({ title: "Category created" });
      setCatDialogOpen(false);
    },
    onError: () => toast({ title: "Failed to create category", variant: "destructive" }),
  });

  const updateCatMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; icon?: string; sortOrder?: number }) => {
      const res = await apiRequest("PATCH", `/api/knowledge-base/categories/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/categories/list"] });
      toast({ title: "Category updated" });
      setCatDialogOpen(false);
    },
    onError: () => toast({ title: "Failed to update category", variant: "destructive" }),
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/knowledge-base/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/categories/list"] });
      toast({ title: "Category deleted" });
      setDeleteCatConfirm(null);
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (data: { name: string; icon: string; color: string }) => {
      const res = await apiRequest("POST", "/api/knowledge-base/tags", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/tags/list"] });
      toast({ title: "Tag created" });
      setTagDialogOpen(false);
    },
    onError: () => toast({ title: "Failed to create tag", variant: "destructive" }),
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; icon?: string; color?: string }) => {
      const res = await apiRequest("PATCH", `/api/knowledge-base/tags/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/tags/list"] });
      toast({ title: "Tag updated" });
      setTagDialogOpen(false);
    },
    onError: () => toast({ title: "Failed to update tag", variant: "destructive" }),
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/knowledge-base/tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/tags/list"] });
      toast({ title: "Tag deleted" });
      setDeleteTagConfirm(null);
    },
  });

  const openNewEditor = () => {
    setEditingArticle(null);
    setTitle("");
    setContent("");
    setCategory(allCategoryNames[0] || "General");
    setSortOrder(0);
    setArticleTags([]);
    setEditorOpen(true);
  };

  const openEditEditor = (article: KnowledgeBaseArticle) => {
    setEditingArticle(article);
    setTitle(article.title);
    setContent(article.content);
    setCategory(article.category);
    setSortOrder(article.sortOrder || 0);
    setArticleTags((article as any).tags || []);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingArticle(null);
  };

  const handleSaveDraft = () => {
    if (!title.trim()) return toast({ title: "Title is required", variant: "destructive" });
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, title, content, category, status: "draft", sortOrder, tags: articleTags });
    } else {
      createMutation.mutate({ title, content, category, status: "draft", sortOrder, tags: articleTags });
    }
  };

  const handlePublish = () => {
    if (!title.trim()) return toast({ title: "Title is required", variant: "destructive" });
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, title, content, category, status: "published", sortOrder, tags: articleTags });
    } else {
      createMutation.mutate({ title, content, category, status: "published", sortOrder, tags: articleTags });
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

  const openNewCat = () => {
    setEditingCat(null);
    setCatName("");
    setCatIcon("Folder");
    setCatSortOrder(categories.length);
    setCatDialogOpen(true);
  };

  const openEditCat = (cat: KnowledgeBaseCategory) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatIcon(cat.icon);
    setCatSortOrder(cat.sortOrder || 0);
    setCatDialogOpen(true);
  };

  const handleSaveCat = () => {
    if (!catName.trim()) return toast({ title: "Category name is required", variant: "destructive" });
    if (editingCat) {
      updateCatMutation.mutate({ id: editingCat.id, name: catName.trim(), icon: catIcon, sortOrder: catSortOrder });
    } else {
      createCatMutation.mutate({ name: catName.trim(), icon: catIcon, sortOrder: catSortOrder });
    }
  };

  const openNewTag = () => {
    setEditingTag(null);
    setTagName("");
    setTagIcon("Tag");
    setTagColor("gray");
    setTagDialogOpen(true);
  };

  const openEditTag = (tag: KnowledgeBaseTag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagIcon(tag.icon);
    setTagColor(tag.color);
    setTagDialogOpen(true);
  };

  const handleSaveTag = () => {
    if (!tagName.trim()) return toast({ title: "Tag name is required", variant: "destructive" });
    if (editingTag) {
      updateTagMutation.mutate({ id: editingTag.id, name: tagName.trim(), icon: tagIcon, color: tagColor });
    } else {
      createTagMutation.mutate({ name: tagName.trim(), icon: tagIcon, color: tagColor });
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    const cat = categories.find(c => c.name === categoryName);
    return cat?.icon || "Folder";
  };

  const toggleArticleTag = (tagName: string) => {
    setArticleTags(prev =>
      prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    );
  };

  return (
    <div className="space-y-6" data-testid="page-knowledge-base">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-kb-title">
            <BookOpen className="w-6 h-6" /> Knowledge Base
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Create and manage help articles, categories, and tags.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-kb">
          <TabsTrigger value="articles" data-testid="tab-articles">
            <FileText className="w-4 h-4 mr-1" /> Articles ({articles.length})
          </TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">
            <Folder className="w-4 h-4 mr-1" /> Categories ({categories.length})
          </TabsTrigger>
          <TabsTrigger value="tags" data-testid="tab-tags">
            <Tag className="w-4 h-4 mr-1" /> Tags ({tags.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4">
          <div className="flex items-center justify-between">
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
            <Button onClick={openNewEditor} data-testid="button-new-article">
              <Plus className="w-4 h-4 mr-2" /> New Article
            </Button>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search articles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" data-testid="input-search-articles" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]" data-testid="select-filter-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {allCategoryNames.map((c) => (
                  <SelectItem key={c} value={c}>
                    <span className="flex items-center gap-2">
                      <DynamicIcon name={getCategoryIcon(c)} className="w-3.5 h-3.5" />
                      {c}
                    </span>
                  </SelectItem>
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
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <DynamicIcon name={getCategoryIcon(article.category)} className="w-3 h-3" />
                              {article.category}
                            </Badge>
                            {article.notionPageId && (
                              <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">Notion</Badge>
                            )}
                          </div>
                          {((article as any).tags || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {((article as any).tags as string[]).map(tagName => {
                                const tagDef = tags.find(t => t.name === tagName);
                                const color = getTagColor(tagDef?.color || "gray");
                                return (
                                  <span key={tagName} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${color.bg} ${color.text} ${color.border}`}>
                                    <DynamicIcon name={tagDef?.icon || "Tag"} className="w-2.5 h-2.5" />
                                    {tagName}
                                  </span>
                                );
                              })}
                            </div>
                          )}
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
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Manage categories to organize your knowledge base articles.</p>
            <Button onClick={openNewCat} data-testid="button-new-category">
              <Plus className="w-4 h-4 mr-2" /> New Category
            </Button>
          </div>

          {categories.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Folder className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No categories yet. Create your first category!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => {
                const articleCount = articles.filter(a => a.category === cat.name).length;
                return (
                  <Card key={cat.id} className="hover:shadow-md transition-shadow" data-testid={`card-category-${cat.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <DynamicIcon name={cat.icon} className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold" data-testid={`text-cat-name-${cat.id}`}>{cat.name}</h3>
                            <p className="text-xs text-muted-foreground">{articleCount} article{articleCount !== 1 ? "s" : ""} · Order: {cat.sortOrder}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditCat(cat)} data-testid={`button-edit-cat-${cat.id}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteCatConfirm(cat.id)} data-testid={`button-delete-cat-${cat.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tags" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Manage tags for fine-grained article classification.</p>
            <Button onClick={openNewTag} data-testid="button-new-tag">
              <Plus className="w-4 h-4 mr-2" /> New Tag
            </Button>
          </div>

          {tags.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Tag className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No tags yet. Create your first tag!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tags.map((tag) => {
                const color = getTagColor(tag.color);
                const articleCount = articles.filter(a => ((a as any).tags || []).includes(tag.name)).length;
                return (
                  <Card key={tag.id} className="hover:shadow-md transition-shadow" data-testid={`card-tag-${tag.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${color.bg} ${color.border}`}>
                            <DynamicIcon name={tag.icon} className={`w-5 h-5 ${color.text}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold" data-testid={`text-tag-name-${tag.id}`}>{tag.name}</h3>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${color.bg} ${color.text} ${color.border}`}>
                                {tag.color}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{articleCount} article{articleCount !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditTag(tag)} data-testid={`button-edit-tag-${tag.id}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteTagConfirm(tag.id)} data-testid={`button-delete-tag-${tag.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Article Editor Dialog */}
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
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-article-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategoryNames.map((c) => (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-2">
                          <DynamicIcon name={getCategoryIcon(c)} className="w-3.5 h-3.5" />
                          {c}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24">
                <Label>Sort Order</Label>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} data-testid="input-sort-order" />
              </div>
            </div>
            {tags.length > 0 && (
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1.5 p-3 border rounded-md bg-muted/30" data-testid="article-tags-picker">
                  {tags.map(tag => {
                    const color = getTagColor(tag.color);
                    const isSelected = articleTags.includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleArticleTag(tag.name)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                          isSelected
                            ? `${color.bg} ${color.text} ${color.border} ring-2 ring-primary/30`
                            : "bg-background text-muted-foreground border-border hover:bg-accent"
                        }`}
                        data-testid={`toggle-tag-${tag.id}`}
                      >
                        <DynamicIcon name={tag.icon} className="w-3 h-3" />
                        {tag.name}
                        {isSelected && <X className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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

      {/* Delete Article Confirm */}
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

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Category name..." data-testid="input-cat-name" />
            </div>
            <div className="flex gap-4">
              <div>
                <Label>Icon</Label>
                <div className="mt-1">
                  <IconPicker value={catIcon} onChange={setCatIcon} />
                </div>
              </div>
              <div className="flex-1">
                <Label>Sort Order</Label>
                <Input type="number" value={catSortOrder} onChange={(e) => setCatSortOrder(parseInt(e.target.value) || 0)} data-testid="input-cat-sort-order" />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DynamicIcon name={catIcon} className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium">{catName || "Category Name"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCat} disabled={createCatMutation.isPending || updateCatMutation.isPending} data-testid="button-save-cat">
              {editingCat ? "Update" : "Create"} Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirm */}
      <Dialog open={!!deleteCatConfirm} onOpenChange={() => setDeleteCatConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure? Articles using this category will keep their current category but it won't appear in the list.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCatConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteCatConfirm && deleteCatMutation.mutate(deleteCatConfirm)} disabled={deleteCatMutation.isPending} data-testid="button-confirm-delete-cat">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTag ? "Edit Tag" : "New Tag"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="Tag name..." data-testid="input-tag-name" />
            </div>
            <div>
              <Label>Icon</Label>
              <div className="mt-1">
                <IconPicker value={tagIcon} onChange={setTagIcon} />
              </div>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2 mt-1.5" data-testid="tag-color-picker">
                {TAG_COLORS.map(color => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setTagColor(color.name)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${color.bg} ${
                      tagColor === color.name ? "ring-2 ring-primary ring-offset-2 border-primary" : `${color.border}`
                    }`}
                    title={color.name}
                    data-testid={`color-option-${color.name}`}
                  />
                ))}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              <div className="flex items-center gap-2">
                {(() => {
                  const color = getTagColor(tagColor);
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${color.bg} ${color.text} ${color.border}`}>
                      <DynamicIcon name={tagIcon} className="w-3.5 h-3.5" />
                      {tagName || "Tag Name"}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTag} disabled={createTagMutation.isPending || updateTagMutation.isPending} data-testid="button-save-tag">
              {editingTag ? "Update" : "Create"} Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tag Confirm */}
      <Dialog open={!!deleteTagConfirm} onOpenChange={() => setDeleteTagConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure? This tag will be removed from the list but articles that use it will keep the tag name.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTagConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTagConfirm && deleteTagMutation.mutate(deleteTagConfirm)} disabled={deleteTagMutation.isPending} data-testid="button-confirm-delete-tag">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
