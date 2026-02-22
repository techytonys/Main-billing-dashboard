const VERCEL_API = "https://api.vercel.com";

function getToken(): string {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) throw new Error("VERCEL_API_TOKEN not configured. Add it in Settings → Secrets.");
  return token;
}

async function vercelFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${VERCEL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = `Vercel API error ${res.status}`;
    try {
      const json = JSON.parse(text);
      message = json.error?.message || json.message || message;
    } catch {
      message = text || message;
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function createVercelProject(name: string, repoUrl?: string): Promise<{ id: string; url: string }> {
  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

  const body: any = {};

  if (repoUrl) {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.\s]+)/);
    if (match) {
      body.gitRepository = {
        type: "github",
        repo: `${match[1]}/${match[2].replace(/\.git$/, "")}`,
      };
    }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const tryName = attempt === 0 ? slug : `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    body.name = tryName;
    try {
      const project = await vercelFetch("/v9/projects", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return {
        id: project.id,
        url: `https://${tryName}.vercel.app`,
      };
    } catch (err: any) {
      if (err.message?.includes("409") || err.message?.toLowerCase().includes("already exists") || err.message?.toLowerCase().includes("conflict")) {
        continue;
      }
      throw err;
    }
  }
  throw new Error("Could not create Vercel project — name is taken. Try a different name.");
}

export async function linkVercelToGitHub(projectId: string, repoUrl: string): Promise<{ url: string }> {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.\s]+)/);
  if (!match) throw new Error("Invalid GitHub repo URL. Use format: https://github.com/user/repo");
  const repoPath = `${match[1]}/${match[2].replace(/\.git$/, "")}`;

  const project = await vercelFetch(`/v9/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({
      gitRepository: {
        type: "github",
        repo: repoPath,
      },
    }),
  });

  const url = project.targets?.production?.url
    ? `https://${project.targets.production.url}`
    : `https://${project.name}.vercel.app`;

  return { url };
}

export async function triggerVercelDeploy(projectName: string): Promise<{ id: string; url: string; state: string }> {
  const deploy = await vercelFetch("/v13/deployments", {
    method: "POST",
    body: JSON.stringify({
      name: projectName,
      target: "production",
    }),
  });

  return {
    id: deploy.id,
    url: deploy.url ? `https://${deploy.url}` : "",
    state: deploy.readyState || "BUILDING",
  };
}

export async function getVercelProject(projectId: string): Promise<{ id: string; url: string; state: string; latestDeployments?: any[] }> {
  const project = await vercelFetch(`/v9/projects/${projectId}`);
  return {
    id: project.id,
    url: project.targets?.production?.url ? `https://${project.targets.production.url}` : `https://${project.name}.vercel.app`,
    state: project.targets?.production?.readyState || "READY",
    latestDeployments: project.latestDeployments,
  };
}

export async function getVercelDeploys(projectId: string): Promise<any[]> {
  try {
    const data = await vercelFetch(`/v6/deployments?projectId=${projectId}&limit=5`);
    return (data.deployments || []).map((d: any) => ({
      id: d.uid,
      state: d.readyState || d.state,
      created_at: new Date(d.created).toISOString(),
      deploy_url: `https://${d.url}`,
    }));
  } catch {
    return [];
  }
}

export async function deleteVercelProject(projectId: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${VERCEL_API}/v9/projects/${projectId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete Vercel project: ${res.status}`);
  }
}

export function isVercelConfigured(): boolean {
  return !!process.env.VERCEL_API_TOKEN;
}
