import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { CheckCircle2, Clock, Circle, ExternalLink, Activity, Zap, FileText, Milestone, ArrowUpRight } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { ProjectUpdate } from "@shared/schema";

interface ProgressData {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    previewUrl: string | null;
    createdAt: string;
  };
  customerName: string;
  updates: ProjectUpdate[];
  completedWork: number;
}

const updateTypeConfig: Record<string, { icon: typeof CheckCircle2; label: string; color: string }> = {
  milestone: { icon: Milestone, label: "Milestone", color: "text-amber-500" },
  update: { icon: Activity, label: "Update", color: "text-blue-500" },
  launch: { icon: Zap, label: "Launch", color: "text-green-500" },
  deliverable: { icon: FileText, label: "Deliverable", color: "text-purple-500" },
};

const statusConfig: Record<string, { icon: typeof CheckCircle2; label: string; color: string }> = {
  completed: { icon: CheckCircle2, label: "Completed", color: "text-green-500" },
  in_progress: { icon: Clock, label: "In Progress", color: "text-amber-500" },
  upcoming: { icon: Circle, label: "Upcoming", color: "text-muted-foreground" },
};

function ProgressSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-48 mb-8" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProjectProgress() {
  const params = useParams<{ projectId: string }>();

  const { data, isLoading, error } = useQuery<ProgressData>({
    queryKey: ["/api/public/progress", params.projectId],
    queryFn: async () => {
      const res = await fetch(`/api/public/progress/${params.projectId}`);
      if (!res.ok) throw new Error("Project not found");
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <ProgressSkeleton />;

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Circle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Project Not Found</h1>
          <p className="text-sm text-muted-foreground">This progress link may be invalid or the project may have been removed.</p>
        </Card>
      </div>
    );
  }

  const { project, customerName, updates, completedWork } = data;
  const projectStatus = project.status === "completed" ? "Completed" : project.status === "active" ? "In Progress" : project.status;

  return (
    <div className="min-h-screen bg-background" data-testid="progress-page">
      <header className="border-b sticky top-0 z-50 bg-background">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" data-testid="text-project-name">{project.name}</p>
              <p className="text-xs text-muted-foreground">Project Progress</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-progress-heading">{project.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">Prepared for {customerName}</p>
            </div>
            <Badge variant="secondary" data-testid="badge-project-status">
              {projectStatus}
            </Badge>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          <Card className="p-4 text-center">
            <p className="text-2xl font-semibold" data-testid="text-update-count">{updates.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Updates</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-semibold" data-testid="text-deliverable-count">{completedWork}</p>
            <p className="text-xs text-muted-foreground mt-1">Deliverables</p>
          </Card>
          <Card className="p-4 text-center col-span-2 sm:col-span-1">
            <p className="text-2xl font-semibold" data-testid="text-started-date">
              {project.createdAt ? formatDate(project.createdAt) : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Started</p>
          </Card>
        </div>

        {project.previewUrl && (
          <Card className="p-4 mb-8">
            <a
              href={project.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3"
              data-testid="link-preview-site"
            >
              <div className="flex items-center gap-3 min-w-0">
                <ExternalLink className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">View Live Preview</p>
                  <p className="text-xs text-muted-foreground truncate">{project.previewUrl}</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </a>
          </Card>
        )}

        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Timeline</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time updates on your project</p>
        </div>

        {updates.length > 0 ? (
          <div className="relative">
            <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border" />
            <div className="space-y-0">
              {updates.map((update, index) => {
                const typeConf = updateTypeConfig[update.type] || updateTypeConfig.update;
                const statusConf = statusConfig[update.status] || statusConfig.completed;
                const StatusIcon = statusConf.icon;
                return (
                  <div key={update.id} className="relative flex gap-4 pb-6" data-testid={`update-item-${update.id}`}>
                    <div className={`w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center shrink-0 z-10 ${statusConf.color}`}>
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 pt-1.5">
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                        <div>
                          <p className="text-sm font-medium" data-testid={`text-update-title-${update.id}`}>{update.title}</p>
                          {update.description && (
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{update.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {typeConf.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {update.createdAt ? formatDate(update.createdAt) : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No updates yet. Check back soon for progress on your project.</p>
          </Card>
        )}

        <div className="mt-12 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            This page refreshes automatically every 30 seconds.
          </p>
        </div>
      </main>
    </div>
  );
}
