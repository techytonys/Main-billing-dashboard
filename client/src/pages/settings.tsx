import { usePageTitle } from "@/hooks/use-page-title";
import { Globe, Bell, BookOpen, Users, FolderOpen, Clock, Receipt, DollarSign, ExternalLink, AlertTriangle, Send, Mail, Webhook } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  usePageTitle("Settings");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configuration and how-to guide
        </p>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">How to Use This Dashboard</h2>
            <p className="text-xs text-muted-foreground">Step-by-step guide to billing your clients</p>
          </div>
        </div>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0">1</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
                <h3 className="font-semibold text-sm">Set Up Your Billing Rates</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Go to <strong>Billing Rates</strong> in the sidebar. This is where you set your prices. For example: Page Design = $200 per page, Image Creation = $25 per image. You can add, edit, or delete rates anytime. These rates are already pre-filled with common web design services.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0">2</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                <h3 className="font-semibold text-sm">Add Your Clients</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Go to <strong>Customers</strong> in the sidebar. Click <strong>Add Customer</strong>. Fill in their name, email, company name, and phone. That's it. You can edit or delete them later if needed.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0">3</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                <h3 className="font-semibold text-sm">Create a Project</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Go to <strong>Projects</strong> in the sidebar. Click <strong>New Project</strong>. Pick the customer from the dropdown, give the project a name (like "Restaurant Website Redesign"), and add a description if you want. Click <strong>Create Project</strong>.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0">4</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <h3 className="font-semibold text-sm">Log Your Work</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This is the main thing you do day to day. When you finish doing something for a client, go to <strong>Projects</strong>, find their project, and click <strong>Log Work</strong>.
              </p>
              <div className="mt-2 p-3 rounded-md bg-muted/50 text-sm space-y-2">
                <p className="font-medium">Example:</p>
                <p className="text-muted-foreground">You just designed 2 pages for Sarah's restaurant website.</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                  <li>Go to <strong>Projects</strong></li>
                  <li>Find "Restaurant Website Redesign"</li>
                  <li>Click <strong>Log Work</strong></li>
                  <li>Select <strong>"Page Design ($200.00/page)"</strong></li>
                  <li>Set quantity to <strong>2</strong></li>
                  <li>Add a note like "Homepage and menu page"</li>
                  <li>Click <strong>Log Work</strong></li>
                </ol>
                <p className="text-muted-foreground">The system calculates: 2 pages x $200 = <strong>$400</strong>. Done.</p>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                You can log as many entries as you want. They all pile up under the project until you create an invoice.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0">5</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="w-4 h-4 text-muted-foreground shrink-0" />
                <h3 className="font-semibold text-sm">Generate an Invoice</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When you're ready to bill the client, go to <strong>Projects</strong>, find their project, and click <strong>Generate Invoice</strong>. The system adds up all the unbilled work, applies your tax rate, and creates an invoice automatically.
              </p>
              <div className="mt-2 p-3 rounded-md bg-muted/50 text-sm space-y-2">
                <p className="font-medium">Example invoice breakdown:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>2x Page Design @ $200 = $400</li>
                  <li>5x Image Assets @ $25 = $125</li>
                  <li>1x Consultation @ $100 = $100</li>
                  <li className="pt-1 border-t font-medium text-foreground">Subtotal: $625</li>
                  <li>Tax (10%): $62.50</li>
                  <li className="font-semibold text-foreground">Total: $687.50</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                You can view all your invoices on the <strong>Invoices</strong> page, and mark them as paid when the client pays you.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0">6</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                <h3 className="font-semibold text-sm">Share the Client Portal</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Each customer gets their own private portal link. Go to <strong>Customers</strong>, find the client, and click <strong>Portal Link</strong> to copy it. Send this link to your client so they can view their invoices, project status, and payment history anytime.
              </p>
              <div className="mt-2 p-3 rounded-md bg-muted/50 text-sm space-y-2">
                <p className="font-medium">What the client sees:</p>
                <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Their total amount due and payment history</li>
                  <li>All their projects and current status</li>
                  <li>Every invoice with full line-item detail</li>
                  <li>Overdue alerts if any invoices are past due</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0">7</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Send className="w-4 h-4 text-muted-foreground shrink-0" />
                <h3 className="font-semibold text-sm">Email Invoices to Clients</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You can email invoices directly to your clients. Go to <strong>Invoices</strong>, find the invoice, and click the <strong>send icon</strong> (paper airplane). The client receives a professional email with the full invoice breakdown and a link to their portal.
              </p>
              <div className="mt-2 p-3 rounded-md bg-muted/50 text-sm space-y-2">
                <p className="font-medium">You can also send from the detail view:</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                  <li>Click the <strong>eye icon</strong> on any invoice to view details</li>
                  <li>Click <strong>"Email Invoice to Client"</strong></li>
                  <li>The invoice is emailed, and draft invoices are automatically marked as pending</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0">8</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0" />
                <h3 className="font-semibold text-sm">Track Overdue Invoices</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The system automatically tracks overdue invoices. When an invoice passes its due date (30 days after you create it), it turns <strong>red</strong> and shows as "overdue" everywhere: on the <strong>Overview</strong>, the <strong>Invoices</strong> page, and in the client's portal. You'll see a red alert banner reminding you to follow up with the client.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Notifications</h2>
              <p className="text-xs text-muted-foreground">Configure billing alerts</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Invoice notifications</p>
                <p className="text-xs text-muted-foreground">Get notified when invoices are generated</p>
              </div>
              <Switch data-testid="switch-invoice-notif" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Payment alerts</p>
                <p className="text-xs text-muted-foreground">Get notified on successful payments</p>
              </div>
              <Switch data-testid="switch-payment-notif" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Unbilled work reminders</p>
                <p className="text-xs text-muted-foreground">Remind you about unbilled work entries</p>
              </div>
              <Switch data-testid="switch-unbilled-notif" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 shrink-0">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Regional Settings</h2>
              <p className="text-xs text-muted-foreground">Currency and locale preferences</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Default Currency</Label>
              <Input id="currency" value="USD" disabled data-testid="input-currency" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" value="America/New_York" disabled data-testid="input-timezone" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 shrink-0">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Email-to-Ticket Setup</h2>
            <p className="text-xs text-muted-foreground">Automatically create support tickets from incoming emails</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="p-3 rounded-md bg-muted/50 text-sm space-y-2">
            <p className="text-muted-foreground">
              When someone sends an email to <strong>hello@aipoweredsites.com</strong>, a support ticket is automatically created in the system. To enable this:
            </p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1 pl-2">
              <li>Go to your <strong>Resend Dashboard</strong> and navigate to <strong>Webhooks</strong></li>
              <li>Add a new webhook endpoint with this URL:</li>
            </ol>
            <div className="p-2 rounded bg-muted font-mono text-xs break-all" data-testid="text-webhook-url">
              {window.location.origin}/api/webhooks/resend/inbound
            </div>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1 pl-2" start={3}>
              <li>Select the <strong>email.received</strong> event type</li>
              <li>Save the webhook and you're done</li>
            </ol>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Webhook className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              Quote form submissions from the landing page also automatically create support tickets.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
