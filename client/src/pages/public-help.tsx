import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, ChevronRight, ArrowLeft, FileText } from "lucide-react";
import type { KnowledgeBaseArticle } from "@shared/schema";

function stripHtml(html: string) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

export default function PublicHelp() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: articles = [], isLoading } = useQuery<KnowledgeBaseArticle[]>({
    queryKey: ["/api/public/knowledge-base"],
  });

  const categories = Array.from(new Set(articles.map((a) => a.category)));

  const filtered = articles.filter((a) => {
    if (selectedCategory && a.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const plain = stripHtml(a.content).toLowerCase();
      return a.title.toLowerCase().includes(q) || plain.includes(q);
    }
    return true;
  });

  const selectedArticle = articles.find((a) => a.slug === selectedSlug);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-home">
            <BookOpen className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold">Help Center</span>
          </a>
          <a href="/questions" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-qa">
            Q&A
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {selectedArticle ? (
          <div data-testid="article-detail-view">
            <Button variant="ghost" className="mb-4 -ml-2" onClick={() => setSelectedSlug(null)} data-testid="button-back-to-list">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to articles
            </Button>
            <div className="mb-6">
              <Badge variant="outline" className="mb-2">{selectedArticle.category}</Badge>
              <h1 className="text-3xl font-bold" data-testid="text-article-detail-title">{selectedArticle.title}</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Last updated {selectedArticle.updatedAt ? new Date(selectedArticle.updatedAt).toLocaleDateString() : "—"}
              </p>
            </div>
            <Card>
              <CardContent
                className="p-6 sm:p-8 prose dark:prose-invert max-w-none article-content"
                data-testid="article-content"
                dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
              />
            </Card>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">How can we help?</h1>
              <p className="text-muted-foreground">Browse our knowledge base for guides, tutorials, and answers.</p>
            </div>

            <div className="relative max-w-xl mx-auto mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search for articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base rounded-xl"
                data-testid="input-search-help"
              />
            </div>

            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mb-8">
                <Badge
                  variant={selectedCategory === null ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1"
                  onClick={() => setSelectedCategory(null)}
                  data-testid="badge-category-all"
                >
                  All
                </Badge>
                {categories.map((cat) => (
                  <Badge
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1"
                    onClick={() => setSelectedCategory(cat)}
                    data-testid={`badge-category-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {cat} ({articles.filter((a) => a.category === cat).length})
                  </Badge>
                ))}
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-16 text-muted-foreground">Loading articles...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No articles found.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map((article) => (
                  <Card
                    key={article.id}
                    className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                    onClick={() => setSelectedSlug(article.slug)}
                    data-testid={`card-help-article-${article.id}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Badge variant="outline" className="text-xs mb-2">{article.category}</Badge>
                          <h3 className="font-semibold group-hover:text-primary transition-colors" data-testid={`text-help-title-${article.id}`}>
                            {article.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {article.content ? stripHtml(article.content).substring(0, 120) + (stripHtml(article.content).length > 120 ? "..." : "") : ""}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t mt-16 py-6 text-center text-xs text-muted-foreground">
        <p>AI Powered Sites · <a href="/" className="hover:underline">Home</a> · <a href="/questions" className="hover:underline">Q&A</a></p>
      </footer>
    </div>
  );
}
