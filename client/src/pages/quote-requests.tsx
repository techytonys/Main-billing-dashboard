import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquareMore, Mail, Phone, Building2, Calendar, DollarSign } from "lucide-react";
import type { QuoteRequest } from "@shared/schema";

const budgetLabels: Record<string, string> = {
  "under-1k": "Under $1,000",
  "1k-5k": "$1,000 - $5,000",
  "5k-10k": "$5,000 - $10,000",
  "10k-25k": "$10,000 - $25,000",
  "25k+": "$25,000+",
  "not-sure": "Not Sure Yet",
};

const projectTypeLabels: Record<string, string> = {
  website: "Website",
  forum: "Forum / Community",
  blog: "Blog Platform",
  backend: "Backend / API",
  "support-portal": "Support Portal",
  ecommerce: "E-Commerce",
  other: "Other",
};

export default function QuoteRequests() {
  const { data: quotes, isLoading } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests"],
  });

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <MessageSquareMore className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-quotes-title">Quote Requests</h1>
        {quotes && (
          <Badge variant="secondary" data-testid="badge-quotes-count">{quotes.length}</Badge>
        )}
      </div>
      {isLoading ? (
        <div className="text-muted-foreground" data-testid="text-quotes-loading">Loading quote requests...</div>
      ) : !quotes || quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquareMore className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground" data-testid="text-quotes-empty">No quote requests yet. They'll appear here when visitors submit the form on your landing page.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quotes.map((quote) => (
            <Card key={quote.id} data-testid={`card-quote-${quote.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-lg">{quote.name}</CardTitle>
                    <div className="flex items-center gap-4 flex-wrap mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        {quote.email}
                      </span>
                      {quote.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" />
                          {quote.phone}
                        </span>
                      )}
                      {quote.company && (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" />
                          {quote.company}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{projectTypeLabels[quote.projectType] || quote.projectType}</Badge>
                    {quote.budget && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {budgetLabels[quote.budget] || quote.budget}
                      </Badge>
                    )}
                    <Badge variant={quote.status === "new" ? "default" : "secondary"}>
                      {quote.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{quote.message}</p>
                {quote.createdAt && (
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {new Date(quote.createdAt).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
