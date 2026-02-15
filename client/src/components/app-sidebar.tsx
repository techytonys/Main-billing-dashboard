import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  FileText,
  Users,
  FolderOpen,
  DollarSign,
  Settings,
  LifeBuoy,
  MessageSquare,
  Calculator,
  MessagesSquare,
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
  { title: "Billing Rates", url: "/admin/billing-rates", icon: DollarSign },
  { title: "Quote Builder", url: "/admin/quote-builder", icon: Calculator },
  { title: "Conversations", url: "/admin/conversations", icon: MessagesSquare },
  { title: "Support Tickets", url: "/admin/support", icon: LifeBuoy },
  { title: "Q&A", url: "/admin/qa", icon: MessageSquare },
];

const settingsItems = [
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

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
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
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
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                    >
                      <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase()}`}>
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
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground">
          AI Powered Sites
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
