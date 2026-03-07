import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  FileText,
  Users,
  FolderOpen,
  DollarSign,
  Settings,
  LifeBuoy,
  ClipboardList,
  Calculator,
  MessagesSquare,
  Key,
  FolderGit2,
  Server,
  Globe,
  BookOpen,
  Shield,
  Users2,
  Sparkles,
  CreditCard,
  BarChart3,
  Link2,
  MessageSquare,
  Bell,
  Building2,
  Search,
  Lightbulb,
  Film,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const logoImg = "/images/logo.png";

const mainItems = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "Customers", url: "/admin/customers", icon: Users },
  { title: "Projects", url: "/admin/projects", icon: FolderOpen },
  { title: "Invoices", url: "/admin/invoices", icon: FileText },
  { title: "Rates", url: "/admin/billing-rates", icon: DollarSign },
  { title: "Payments", url: "/admin/payment-methods", icon: CreditCard },
  { title: "Quotes", url: "/admin/quote-builder", icon: Calculator },
  { title: "Onboarding", url: "/admin/onboarding", icon: ClipboardList },
];

const engageItems = [
  { title: "Conversations", url: "/admin/conversations", icon: MessagesSquare },
  { title: "Support", url: "/admin/support", icon: LifeBuoy },
  { title: "Community", url: "/admin/community", icon: Users2 },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Link Tracker", url: "/admin/link-tracker", icon: Link2 },
  { title: "SMS", url: "/admin/sms", icon: MessageSquare },
  { title: "Video Optimizer", url: "/admin/video-optimizer", icon: Film },
  { title: "Directories", url: "/admin/directories", icon: Building2 },
  { title: "SEO Keywords", url: "/admin/seo-keywords", icon: Search },
  { title: "Tip of the Day", url: "/tips", icon: Lightbulb },
  { title: "Subscribe", url: "/subscribe", icon: Bell },
];

const manageItems = [
  { title: "Knowledge Base", url: "/admin/knowledge-base", icon: BookOpen },
  { title: "Code Backups", url: "/admin/code-backups", icon: FolderGit2 },
  { title: "Servers", url: "/admin/servers", icon: Server },
  { title: "DNS Domains", url: "/admin/dns-domains", icon: Globe },
  { title: "API Keys", url: "/admin/api-keys", icon: Key },
  { title: "Licenses", url: "/admin/licenses", icon: Shield },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

function NavGroup({ label, items, location }: { label: string; items: typeof mainItems; location: string }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = location === item.url ||
              (item.url !== "/admin" && location.startsWith(item.url));
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                >
                  <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/admin">
          <div className="flex items-center gap-2.5 cursor-pointer" data-testid="link-logo">
            <img src={logoImg} alt="AI Powered Sites" className="w-8 h-8 rounded-md object-cover" />
            <div>
              <span className="text-sm font-semibold tracking-tight leading-tight">AI Powered Sites</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Core" items={mainItems} location={location} />
        <NavGroup label="Engage" items={engageItems} location={location} />
        <NavGroup label="Manage" items={manageItems} location={location} />
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Powered Sites</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
