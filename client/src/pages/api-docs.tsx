import { useState } from "react";
import { Book, Key, Shield, Code2, Copy, Check, ChevronDown, ChevronRight, Zap, Users, FolderOpen, FileText, ArrowRight, Terminal, Globe, Lock, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function CopyBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 text-sm font-mono overflow-x-auto border border-zinc-800">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white hover:bg-zinc-800"
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );
}

function EndpointCard({ method, path, description, scopes, example, response, children }: {
  method: string;
  path: string;
  description: string;
  scopes: string;
  example?: string;
  response?: string;
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const methodColors: Record<string, string> = {
    GET: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    POST: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    PATCH: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
  };

  return (
    <Card className="overflow-hidden border" data-testid={`endpoint-${method.toLowerCase()}-${path.replace(/[/:]/g, "-")}`}>
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Badge variant="outline" className={`font-mono text-xs px-2 py-0.5 ${methodColors[method] || ""}`}>
          {method}
        </Badge>
        <code className="text-sm font-mono font-medium flex-1">{path}</code>
        <Badge variant="outline" className="text-xs">{scopes}</Badge>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          <p className="text-sm text-muted-foreground">{description}</p>
          {children}
          {example && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Example Request</p>
              <CopyBlock code={example} />
            </div>
          )}
          {response && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Example Response</p>
              <CopyBlock code={response} language="json" />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function StepCard({ number, title, description, children }: { number: number; title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
          {number}
        </div>
        <div className="w-px flex-1 bg-border mt-2" />
      </div>
      <div className="pb-8">
        <h3 className="font-semibold text-base mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        {children}
      </div>
    </div>
  );
}

export default function ApiDocs() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const baseUrl = window.location.origin;

  const sections = [
    { id: "getting-started", label: "Getting Started", icon: Zap },
    { id: "authentication", label: "Authentication", icon: Lock },
    { id: "customers", label: "Customers", icon: Users },
    { id: "projects", label: "Projects", icon: FolderOpen },
    { id: "invoices", label: "Invoices", icon: FileText },
    { id: "work-entries", label: "Work Entries", icon: Terminal },
    { id: "errors", label: "Error Handling", icon: AlertCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Book className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold" data-testid="text-api-docs-title">AI Powered Sites API</h1>
              <p className="text-sm text-muted-foreground">Simple, powerful API for your integrations</p>
            </div>
            <Badge variant="outline" className="ml-auto">v1</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">
        <nav className="w-48 shrink-0 hidden lg:block sticky top-24 self-start">
          <div className="space-y-1">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => { setActiveSection(s.id); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" }); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left ${activeSection === s.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                data-testid={`nav-${s.id}`}
              >
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="flex-1 min-w-0 space-y-12">
          <section id="getting-started">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold">Getting Started</h2>
            </div>

            <Card className="p-6 mb-6 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 border-primary/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Welcome to the API</h3>
                  <p className="text-sm text-muted-foreground">
                    The AI Powered Sites API lets you read your customers, projects, and invoices, and log work entries — all with simple HTTP requests. 
                    No complex setup needed.
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-0">
              <StepCard number={1} title="Get Your API Key" description="Go to your admin dashboard and create an API key. You'll need it for all requests.">
                <Card className="p-4 bg-muted/30">
                  <div className="flex items-center gap-2 text-sm">
                    <Key className="w-4 h-4 text-primary" />
                    <span>Dashboard</span>
                    <ArrowRight className="w-3 h-3" />
                    <span>API Keys</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-medium">Create API Key</span>
                  </div>
                </Card>
              </StepCard>

              <StepCard number={2} title="Make Your First Request" description="Try fetching your customers. Replace YOUR_API_KEY with your actual key.">
                <CopyBlock code={`curl ${baseUrl}/api/v1/customers \\
  -H "Authorization: Bearer YOUR_API_KEY"`} />
              </StepCard>

              <StepCard number={3} title="Check the Response" description="You'll get back a JSON response with your data. All responses follow the same format.">
                <CopyBlock code={`{
  "data": [
    {
      "id": "abc123",
      "name": "Acme Corp",
      "email": "contact@acme.com",
      "company": "Acme Corp",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ]
}`} language="json" />
              </StepCard>
            </div>

            <Card className="p-4 border-blue-500/20 bg-blue-500/5">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Base URL</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">{baseUrl}/api/v1</code>
                  <p className="text-xs text-muted-foreground mt-1">All endpoints start with this URL. Include your API key in every request.</p>
                </div>
              </div>
            </Card>
          </section>

          <section id="authentication" className="scroll-mt-20">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold">Authentication</h2>
            </div>

            <p className="text-muted-foreground mb-4">
              Every request needs your API key in the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Authorization</code> header.
            </p>

            <CopyBlock code={`Authorization: Bearer aips_your_api_key_here`} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <h4 className="font-semibold text-sm">Read Only</h4>
                </div>
                <p className="text-xs text-muted-foreground">View customers, projects, invoices. Can't make changes.</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Code2 className="w-4 h-4 text-blue-500" />
                  <h4 className="font-semibold text-sm">Read & Write</h4>
                </div>
                <p className="text-xs text-muted-foreground">View data plus create work entries and log time.</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-purple-500" />
                  <h4 className="font-semibold text-sm">Full Access</h4>
                </div>
                <p className="text-xs text-muted-foreground">Complete access to all API features.</p>
              </Card>
            </div>

            <Card className="p-4 mt-4 border-amber-500/20 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Keep Your Key Safe</p>
                  <p className="text-xs text-muted-foreground mt-1">Never share your API key publicly or put it in frontend code. Store it in environment variables or a secrets manager.</p>
                </div>
              </div>
            </Card>
          </section>

          <section id="customers" className="scroll-mt-20">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold">Customers</h2>
            </div>
            <div className="space-y-3">
              <EndpointCard
                method="GET"
                path="/api/v1/customers"
                description="Get a list of all your customers. If your API key is scoped to a specific customer, only that customer will be returned."
                scopes="read"
                example={`curl ${baseUrl}/api/v1/customers \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                response={`{
  "data": [
    {
      "id": "abc123",
      "name": "Acme Corp",
      "email": "contact@acme.com",
      "company": "Acme Corp",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ]
}`}
              />
              <EndpointCard
                method="GET"
                path="/api/v1/customers/:id"
                description="Get details for a specific customer by their ID."
                scopes="read"
                example={`curl ${baseUrl}/api/v1/customers/abc123 \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                response={`{
  "data": {
    "id": "abc123",
    "name": "Acme Corp",
    "email": "contact@acme.com",
    "company": "Acme Corp",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}`}
              />
            </div>
          </section>

          <section id="projects" className="scroll-mt-20">
            <div className="flex items-center gap-2 mb-6">
              <FolderOpen className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold">Projects</h2>
            </div>
            <div className="space-y-3">
              <EndpointCard
                method="GET"
                path="/api/v1/projects"
                description="Get all projects. Filter by customer using the customerId query parameter."
                scopes="read"
                example={`curl "${baseUrl}/api/v1/projects?customerId=abc123" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                response={`{
  "data": [
    {
      "id": "proj_1",
      "name": "Website Redesign",
      "description": "Complete redesign of corporate site",
      "status": "active",
      "customerId": "abc123",
      "previewUrl": "https://preview.example.com",
      "createdAt": "2025-02-01T09:00:00Z"
    }
  ]
}`}
              />
              <EndpointCard
                method="GET"
                path="/api/v1/projects/:id"
                description="Get a specific project by its ID."
                scopes="read"
                example={`curl ${baseUrl}/api/v1/projects/proj_1 \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
              />
              <EndpointCard
                method="GET"
                path="/api/v1/projects/:id/updates"
                description="Get all progress updates for a project. Returns milestones, deliverables, and status updates in chronological order."
                scopes="read"
                example={`curl ${baseUrl}/api/v1/projects/proj_1/updates \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                response={`{
  "data": [
    {
      "id": "upd_1",
      "projectId": "proj_1",
      "type": "milestone",
      "title": "Design Approved",
      "description": "Homepage design has been approved",
      "createdAt": "2025-02-10T14:00:00Z"
    }
  ]
}`}
              />
            </div>
          </section>

          <section id="invoices" className="scroll-mt-20">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold">Invoices</h2>
            </div>
            <div className="space-y-3">
              <EndpointCard
                method="GET"
                path="/api/v1/invoices"
                description="Get all invoices. Filter by status using the status query parameter (draft, pending, paid, overdue)."
                scopes="read"
                example={`curl "${baseUrl}/api/v1/invoices?status=pending" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                response={`{
  "data": [
    {
      "id": "inv_1",
      "invoiceNumber": "INV-001",
      "customerId": "abc123",
      "projectId": "proj_1",
      "status": "pending",
      "totalCents": 250000,
      "dueDate": "2025-03-01",
      "createdAt": "2025-02-15T10:00:00Z"
    }
  ]
}`}
              >
                <Card className="p-3 bg-muted/30">
                  <p className="text-xs font-medium mb-1">Understanding Amounts</p>
                  <p className="text-xs text-muted-foreground">All money amounts are in <strong>cents</strong>. So 250000 = $2,500.00. Divide by 100 to get dollars.</p>
                </Card>
              </EndpointCard>
              <EndpointCard
                method="GET"
                path="/api/v1/invoices/:id"
                description="Get a single invoice with its line items. Shows exactly what was billed and the breakdown."
                scopes="read"
                example={`curl ${baseUrl}/api/v1/invoices/inv_1 \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                response={`{
  "data": {
    "id": "inv_1",
    "invoiceNumber": "INV-001",
    "status": "pending",
    "totalCents": 250000,
    "dueDate": "2025-03-01",
    "lineItems": [
      {
        "description": "Homepage Design",
        "quantity": 1,
        "unitPriceCents": 150000,
        "totalCents": 150000
      },
      {
        "description": "Custom Images",
        "quantity": 5,
        "unitPriceCents": 20000,
        "totalCents": 100000
      }
    ]
  }
}`}
              />
            </div>
          </section>

          <section id="work-entries" className="scroll-mt-20">
            <div className="flex items-center gap-2 mb-6">
              <Terminal className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold">Work Entries</h2>
            </div>
            <div className="space-y-3">
              <EndpointCard
                method="POST"
                path="/api/v1/work-entries"
                description="Log a new work entry against a project. This requires the 'write' scope. The entry will be available for invoicing later."
                scopes="write"
                example={`curl -X POST ${baseUrl}/api/v1/work-entries \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "proj_1",
    "billingRateId": "rate_1",
    "quantity": 3,
    "description": "Designed 3 inner pages"
  }'`}
                response={`{
  "data": {
    "id": "we_1",
    "projectId": "proj_1",
    "billingRateId": "rate_1",
    "quantity": 3,
    "description": "Designed 3 inner pages",
    "createdAt": "2025-02-20T15:00:00Z"
  }
}`}
              >
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Required Fields</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">projectId</code>
                      <span className="text-xs text-muted-foreground">Project ID</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">billingRateId</code>
                      <span className="text-xs text-muted-foreground">Rate to apply</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">quantity</code>
                      <span className="text-xs text-muted-foreground">Number of units</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">description</code>
                      <span className="text-xs text-muted-foreground">What was done</span>
                    </div>
                  </div>
                </div>
              </EndpointCard>
            </div>
          </section>

          <section id="errors" className="scroll-mt-20">
            <div className="flex items-center gap-2 mb-6">
              <AlertCircle className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold">Error Handling</h2>
            </div>

            <p className="text-muted-foreground mb-4">
              When something goes wrong, the API returns a clear error message with an appropriate HTTP status code.
            </p>

            <div className="space-y-3">
              <Card className="p-4">
                <div className="grid grid-cols-[80px_1fr] gap-3 items-start">
                  <Badge variant="outline" className="font-mono text-xs justify-center bg-red-500/10 text-red-600 border-red-500/20">401</Badge>
                  <div>
                    <p className="font-medium text-sm">Unauthorized</p>
                    <p className="text-xs text-muted-foreground">Your API key is missing, invalid, or not included in the Authorization header.</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="grid grid-cols-[80px_1fr] gap-3 items-start">
                  <Badge variant="outline" className="font-mono text-xs justify-center bg-amber-500/10 text-amber-600 border-amber-500/20">403</Badge>
                  <div>
                    <p className="font-medium text-sm">Forbidden</p>
                    <p className="text-xs text-muted-foreground">Your key doesn't have the required scope, is disabled, or has expired.</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="grid grid-cols-[80px_1fr] gap-3 items-start">
                  <Badge variant="outline" className="font-mono text-xs justify-center bg-yellow-500/10 text-yellow-600 border-yellow-500/20">404</Badge>
                  <div>
                    <p className="font-medium text-sm">Not Found</p>
                    <p className="text-xs text-muted-foreground">The resource you requested doesn't exist.</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="grid grid-cols-[80px_1fr] gap-3 items-start">
                  <Badge variant="outline" className="font-mono text-xs justify-center bg-red-500/10 text-red-600 border-red-500/20">500</Badge>
                  <div>
                    <p className="font-medium text-sm">Server Error</p>
                    <p className="text-xs text-muted-foreground">Something went wrong on our end. Try again in a moment.</p>
                  </div>
                </div>
              </Card>
            </div>

            <CopyBlock code={`{
  "error": "Missing required scope: 'write'. Your key has: read"
}`} language="json" />

            <Card className="p-6 mt-8 text-center bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <h3 className="font-semibold text-lg mb-2">Need Help?</h3>
              <p className="text-sm text-muted-foreground mb-4">Start a conversation with us or check out the Q&A section for common questions.</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" asChild>
                  <a href="/#contact">Contact Us</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/questions">Q&A</a>
                </Button>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
