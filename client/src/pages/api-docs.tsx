import { useState } from "react";
import { Book, Key, Shield, Code2, Copy, Check, ChevronDown, ChevronRight, Zap, Users, FolderOpen, FileText, ArrowRight, Terminal, Globe, Lock, CheckCircle2, AlertCircle, Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function CopyBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-[#0d1117] text-zinc-200 rounded-md p-5 text-[13px] font-mono overflow-x-auto border border-white/[0.06] leading-relaxed shadow-inner">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-3 right-3 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all text-zinc-400 hover:text-white hover:bg-white/10 rounded-md"
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
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
  const methodStyles: Record<string, { bg: string; text: string; glow: string }> = {
    GET: { bg: "bg-emerald-500/10", text: "text-emerald-400", glow: "shadow-emerald-500/5" },
    POST: { bg: "bg-blue-500/10", text: "text-blue-400", glow: "shadow-blue-500/5" },
    PATCH: { bg: "bg-amber-500/10", text: "text-amber-400", glow: "shadow-amber-500/5" },
    DELETE: { bg: "bg-red-500/10", text: "text-red-400", glow: "shadow-red-500/5" },
  };
  const style = methodStyles[method] || methodStyles.GET;

  return (
    <div className={`rounded-md border border-white/[0.06] bg-white/[0.01] overflow-hidden transition-all duration-200 hover:border-white/[0.1] ${expanded ? "shadow-lg " + style.glow : ""}`} data-testid={`endpoint-${method.toLowerCase()}-${path.replace(/[/:]/g, "-")}`}>
      <button
        className="w-full flex items-center gap-3 p-4 sm:p-5 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md ${style.bg} ${style.text} font-mono text-xs font-bold tracking-wider min-w-[52px]`}>
          {method}
        </span>
        <code className="text-sm font-mono font-medium flex-1 text-white/80">{path}</code>
        <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/40 font-medium">{scopes}</span>
        <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${expanded ? "bg-white/[0.06]" : ""}`}>
          {expanded ? <ChevronDown className="w-4 h-4 text-white/40" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 space-y-4 bg-white/[0.01]">
          <p className="text-sm text-white/50 leading-relaxed">{description}</p>
          {children}
          {example && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-1 h-4 rounded-full bg-blue-500/50" />
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Example Request</p>
              </div>
              <CopyBlock code={example} />
            </div>
          )}
          {response && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-1 h-4 rounded-full bg-emerald-500/50" />
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Example Response</p>
              </div>
              <CopyBlock code={response} language="json" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepCard({ number, title, description, children }: { number: number; title: string; description: string; children?: React.ReactNode }) {
  const colors = ["from-blue-500 to-cyan-500", "from-violet-500 to-purple-500", "from-emerald-500 to-teal-500"];
  const color = colors[(number - 1) % colors.length];
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-lg`}>
          {number}
        </div>
        <div className="w-px flex-1 bg-gradient-to-b from-white/10 to-transparent mt-3" />
      </div>
      <div className="pb-10">
        <h3 className="font-semibold text-base text-white/90 mb-1.5">{title}</h3>
        <p className="text-sm text-white/45 mb-4 leading-relaxed">{description}</p>
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
    <div className="min-h-screen bg-[#0a0a0f] text-white" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="border-b border-white/[0.06] bg-[#0a0a0f]/80 sticky top-0 z-10" style={{ backdropFilter: "blur(20px)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/[0.06] flex items-center justify-center">
              <Book className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white/90" data-testid="text-api-docs-title">AI Powered Sites API</h1>
              <p className="text-xs text-white/40">Simple, powerful API for your integrations</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[11px] font-semibold">v1</Badge>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/[0.06] border border-emerald-500/15">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-emerald-400/80 font-medium">Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 flex gap-10">
        <nav className="w-52 shrink-0 hidden lg:block sticky top-24 self-start">
          <div className="space-y-1">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => { setActiveSection(s.id); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" }); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-md text-sm transition-all duration-200 text-left ${activeSection === s.id ? "bg-blue-500/10 text-blue-400 font-medium border border-blue-500/15" : "text-white/40 hover:text-white/70 hover:bg-white/[0.03] border border-transparent"}`}
                data-testid={`nav-${s.id}`}
              >
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            ))}
          </div>
          <div className="mt-6 p-4 rounded-md bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[11px] text-white/30 mb-2 font-medium uppercase tracking-wider">Base URL</p>
            <code className="text-[11px] text-cyan-400/70 font-mono break-all">{baseUrl}/api/v1</code>
          </div>
        </nav>

        <div className="flex-1 min-w-0 space-y-16">
          <section id="getting-started">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-md bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/[0.06] flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white/90">Getting Started</h2>
            </div>

            <div className="relative p-6 sm:p-8 mb-8 rounded-md border border-blue-500/15 bg-gradient-to-br from-blue-500/[0.05] via-cyan-500/[0.02] to-transparent overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-md bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/[0.06] flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/10">
                  <Globe className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-white/90 mb-2">Welcome to the API</h3>
                  <p className="text-sm text-white/45 leading-relaxed">
                    The AI Powered Sites API lets you read your customers, projects, and invoices, and log work entries — all with simple HTTP requests. 
                    No complex setup needed.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-0">
              <StepCard number={1} title="Get Your API Key" description="Go to your admin dashboard and create an API key. You'll need it for all requests.">
                <div className="flex items-center gap-2.5 p-4 rounded-md bg-white/[0.02] border border-white/[0.06] text-sm">
                  <Key className="w-4 h-4 text-blue-400" />
                  <span className="text-white/50">Dashboard</span>
                  <ArrowRight className="w-3 h-3 text-white/20" />
                  <span className="text-white/50">API Keys</span>
                  <ArrowRight className="w-3 h-3 text-white/20" />
                  <span className="font-medium text-white/70">Create API Key</span>
                </div>
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

            <div className="flex items-start gap-4 p-5 rounded-md border border-blue-500/15 bg-blue-500/[0.04]">
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-white/80">Base URL</p>
                <code className="text-sm bg-white/[0.04] px-3 py-1.5 rounded-md mt-2 inline-block font-mono text-cyan-400/80 border border-white/[0.06]">{baseUrl}/api/v1</code>
                <p className="text-xs text-white/35 mt-2">All endpoints start with this URL. Include your API key in every request.</p>
              </div>
            </div>
          </section>

          <section id="authentication" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-md bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-white/[0.06] flex items-center justify-center">
                <Lock className="w-5 h-5 text-violet-400" />
              </div>
              <h2 className="text-2xl font-bold text-white/90">Authentication</h2>
            </div>

            <p className="text-white/45 mb-5 text-sm leading-relaxed">
              Every request needs your API key in the <code className="bg-white/[0.06] px-2 py-0.5 rounded-md text-xs font-mono text-cyan-400/70">Authorization</code> header.
            </p>

            <CopyBlock code={`Authorization: Bearer aips_your_api_key_here`} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {[
                { icon: Shield, title: "Read Only", desc: "View customers, projects, invoices. Can't make changes.", color: "from-emerald-500/15 to-teal-500/15", iconColor: "text-emerald-400", border: "border-emerald-500/10" },
                { icon: Code2, title: "Read & Write", desc: "View data plus create work entries and log time.", color: "from-blue-500/15 to-cyan-500/15", iconColor: "text-blue-400", border: "border-blue-500/10" },
                { icon: Key, title: "Full Access", desc: "Complete access to all API features.", color: "from-violet-500/15 to-purple-500/15", iconColor: "text-violet-400", border: "border-violet-500/10" },
              ].map(item => (
                <div key={item.title} className={`group p-5 rounded-md bg-white/[0.02] border border-white/[0.06] hover:${item.border} hover:bg-white/[0.03] transition-all duration-300`}>
                  <div className={`w-10 h-10 rounded-md bg-gradient-to-br ${item.color} border border-white/[0.06] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300`}>
                    <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                  </div>
                  <h4 className="font-semibold text-sm text-white/80 mb-1">{item.title}</h4>
                  <p className="text-xs text-white/35 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-4 p-5 mt-6 rounded-md border border-amber-500/15 bg-amber-500/[0.04]">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-white/80">Keep Your Key Safe</p>
                <p className="text-xs text-white/35 mt-1 leading-relaxed">Never share your API key publicly or put it in frontend code. Store it in environment variables or a secrets manager.</p>
              </div>
            </div>
          </section>

          <section id="customers" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-md bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/[0.06] flex items-center justify-center">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold text-white/90">Customers</h2>
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
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-md bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/[0.06] flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-white/90">Projects</h2>
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
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-md bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-white/[0.06] flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white/90">Invoices</h2>
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
                <div className="flex items-start gap-3 p-4 rounded-md bg-white/[0.02] border border-white/[0.06]">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-white/60 mb-1">Understanding Amounts</p>
                    <p className="text-xs text-white/35 leading-relaxed">All money amounts are in <strong className="text-white/50">cents</strong>. So 250000 = $2,500.00. Divide by 100 to get dollars.</p>
                  </div>
                </div>
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
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-md bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-white/[0.06] flex items-center justify-center">
                <Terminal className="w-5 h-5 text-pink-400" />
              </div>
              <h2 className="text-2xl font-bold text-white/90">Work Entries</h2>
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
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 rounded-full bg-violet-500/50" />
                    <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Required Fields</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { field: "projectId", label: "Project ID" },
                      { field: "billingRateId", label: "Rate to apply" },
                      { field: "quantity", label: "Number of units" },
                      { field: "description", label: "What was done" },
                    ].map(f => (
                      <div key={f.field} className="flex items-center gap-2.5 p-2.5 rounded-md bg-white/[0.02] border border-white/[0.04]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <code className="text-xs bg-white/[0.04] px-2 py-0.5 rounded font-mono text-cyan-400/70">{f.field}</code>
                        <span className="text-xs text-white/35">{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </EndpointCard>
            </div>
          </section>

          <section id="errors" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-md bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-white/[0.06] flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white/90">Error Handling</h2>
            </div>

            <p className="text-white/45 mb-6 text-sm leading-relaxed">
              When something goes wrong, the API returns a clear error message with an appropriate HTTP status code.
            </p>

            <div className="space-y-3">
              {[
                { code: "401", label: "Unauthorized", desc: "Your API key is missing, invalid, or not included in the Authorization header.", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/10" },
                { code: "403", label: "Forbidden", desc: "Your key doesn't have the required scope, is disabled, or has expired.", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/10" },
                { code: "404", label: "Not Found", desc: "The resource you requested doesn't exist.", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/10" },
                { code: "500", label: "Server Error", desc: "Something went wrong on our end. Try again in a moment.", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/10" },
              ].map(item => (
                <div key={item.code} className="flex items-start gap-4 p-5 rounded-md bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                  <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md ${item.bg} ${item.color} ${item.border} border font-mono text-xs font-bold min-w-[52px]`}>
                    {item.code}
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-white/80">{item.label}</p>
                    <p className="text-xs text-white/35 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <CopyBlock code={`{
  "error": "Missing required scope: 'write'. Your key has: read"
}`} language="json" />
            </div>

            <div className="relative p-8 mt-10 text-center rounded-md border border-blue-500/15 bg-gradient-to-br from-blue-500/[0.04] via-violet-500/[0.02] to-transparent overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/[0.06] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/10">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="font-bold text-xl text-white/90 mb-3">Need Help?</h3>
              <p className="text-sm text-white/40 mb-6 max-w-md mx-auto">Start a conversation with us or check out the Q&A section for common questions.</p>
              <div className="flex gap-3 justify-center">
                <Button className="bg-gradient-to-r from-blue-500 to-violet-500 border-0 text-white font-medium shadow-lg shadow-blue-500/20" asChild>
                  <a href="/#contact">Contact Us</a>
                </Button>
                <Button className="bg-white/[0.04] border border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors" asChild>
                  <a href="/questions">Q&A</a>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
