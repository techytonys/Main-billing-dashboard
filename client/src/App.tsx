import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Overview from "@/pages/overview";
import Customers from "@/pages/customers";
import Projects from "@/pages/projects";
import Invoices from "@/pages/invoices";
import BillingRates from "@/pages/billing-rates";
import PaymentMethods from "@/pages/payment-methods";
import Settings from "@/pages/settings";
import ClientPortal from "@/pages/client-portal";
import LandingPage from "@/pages/landing";
import QuoteRequests from "@/pages/quote-requests";
import SupportTickets from "@/pages/support-tickets";
import QaAdmin from "@/pages/qa-admin";
import PublicQA from "@/pages/public-qa";
import ProjectProgress from "@/pages/project-progress";
import QuoteBuilder from "@/pages/quote-builder";
import QuoteView from "@/pages/quote-view";
import ConversationPage from "@/pages/conversation";
import AdminConversations from "@/pages/admin-conversations";
import ApiKeys from "@/pages/api-keys";
import ApiDocs from "@/pages/api-docs";
import CodeBackups from "@/pages/code-backups";
import LeadGenerator from "@/pages/lead-generator";
import LinodeServers from "@/pages/linode-servers";
import KnowledgeBase from "@/pages/knowledge-base";
import PublicHelp from "@/pages/public-help";
import LoginPage from "@/pages/login";

function DashboardRouter() {
  return (
    <Switch>
      <Route path="/admin" component={Overview} />
      <Route path="/admin/customers" component={Customers} />
      <Route path="/admin/projects" component={Projects} />
      <Route path="/admin/invoices" component={Invoices} />
      <Route path="/admin/billing-rates" component={BillingRates} />
      <Route path="/admin/payment-methods" component={PaymentMethods} />
      <Route path="/admin/quotes" component={QuoteRequests} />
      <Route path="/admin/support" component={SupportTickets} />
      <Route path="/admin/qa" component={QaAdmin} />
      <Route path="/admin/quote-builder" component={QuoteBuilder} />
      <Route path="/admin/conversations" component={AdminConversations} />
      <Route path="/admin/api-keys" component={ApiKeys} />
      <Route path="/admin/code-backups" component={CodeBackups} />
      <Route path="/admin/lead-generator" component={LeadGenerator} />
      <Route path="/admin/servers" component={LinodeServers} />
      <Route path="/admin/knowledge-base" component={KnowledgeBase} />
      <Route path="/admin/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function DashboardLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const { user, isLoading, isAuthenticated: isLoggedIn } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      toast({ title: "Unauthorized", description: "Please sign in to access the dashboard.", variant: "destructive" });
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
    }
  }, [isLoading, isLoggedIn]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "U";

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-3 flex-wrap px-4 py-2 border-b sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Avatar className="w-7 h-7" data-testid="img-user-avatar">
                  <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground hidden sm:inline" data-testid="text-user-name">
                  {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Admin"}
                </span>
              </div>
              <a href="/api/logout">
                <Button variant="ghost" size="icon" data-testid="button-logout">
                  <LogOut className="w-4 h-4" />
                </Button>
              </a>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 bg-dot-pattern">
            <DashboardRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/questions" component={PublicQA} />
      <Route path="/portal/:token" component={ClientPortal} />
      <Route path="/progress/:projectId" component={ProjectProgress} />
      <Route path="/quote/:token" component={QuoteView} />
      <Route path="/conversation/:token" component={ConversationPage} />
      <Route path="/api/docs" component={ApiDocs} />
      <Route path="/help" component={PublicHelp} />
      <Route path="/login" component={LoginPage} />
      <Route path="/admin/:rest*">
        <DashboardLayout />
      </Route>
      <Route path="/admin">
        <DashboardLayout />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppRouter />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
