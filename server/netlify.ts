const NETLIFY_API = "https://api.netlify.com/api/v1";

function getToken(): string {
  const token = process.env.NETLIFY_API_TOKEN;
  if (!token) throw new Error("NETLIFY_API_TOKEN not configured. Add it in Settings → Secrets.");
  return token;
}

async function netlifyFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${NETLIFY_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = `Netlify API error ${res.status}`;
    try {
      const json = JSON.parse(text);
      message = json.message || json.error || message;
    } catch {
      message = text || message;
    }
    throw new Error(message);
  }
  return res.json();
}

export async function createNetlifySite(name: string): Promise<{ id: string; url: string; admin_url: string }> {
  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

  for (let attempt = 0; attempt < 5; attempt++) {
    const tryName = attempt === 0 ? slug : `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    try {
      const site = await netlifyFetch("/sites", {
        method: "POST",
        body: JSON.stringify({ name: tryName }),
      });
      return { id: site.id, url: site.ssl_url || site.url, admin_url: site.admin_url };
    } catch (err: any) {
      if (err.message?.includes("409") || err.message?.toLowerCase().includes("already exists") || err.message?.toLowerCase().includes("taken")) {
        continue;
      }
      throw err;
    }
  }
  throw new Error("Could not create Netlify site — name is taken. Try a different project name.");
}

export async function linkSiteToGitHub(siteId: string, repoUrl: string, branch: string = "main"): Promise<{ url: string }> {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.\s]+)/);
  if (!match) throw new Error("Invalid GitHub repo URL. Use format: https://github.com/user/repo");
  const repoPath = `${match[1]}/${match[2].replace(/\.git$/, "")}`;

  const site = await netlifyFetch(`/sites/${siteId}`, {
    method: "PATCH",
    body: JSON.stringify({
      repo: {
        provider: "github",
        repo: repoPath,
        branch,
        cmd: "npm run build",
        dir: "dist/public",
      },
    }),
  });
  return { url: site.ssl_url || site.url };
}

export async function createBuildHook(siteId: string, title: string = "Dashboard Deploy"): Promise<string> {
  const hook = await netlifyFetch(`/sites/${siteId}/build_hooks`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  return hook.url;
}

export async function triggerDeploy(siteId: string): Promise<{ id: string; state: string; deploy_url: string }> {
  try {
    const deploy = await netlifyFetch(`/sites/${siteId}/builds`, {
      method: "POST",
    });
    return { id: deploy.build_id || deploy.id, state: deploy.state || "building", deploy_url: deploy.deploy_url || "" };
  } catch (err: any) {
    if (err.message?.includes("422") || err.message?.toLowerCase().includes("no repo")) {
      throw new Error("Cannot deploy — link a GitHub repo first, or deploy manually from Netlify dashboard.");
    }
    throw err;
  }
}

export async function getNetlifySite(siteId: string): Promise<{ id: string; url: string; state: string; published_deploy?: any }> {
  const site = await netlifyFetch(`/sites/${siteId}`);
  return {
    id: site.id,
    url: site.ssl_url || site.url,
    state: site.state,
    published_deploy: site.published_deploy,
  };
}

export async function deleteNetlifySite(siteId: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${NETLIFY_API}/sites/${siteId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete Netlify site: ${res.status}`);
  }
}

export async function getNetlifyDeploys(siteId: string): Promise<any[]> {
  try {
    return await netlifyFetch(`/sites/${siteId}/deploys?per_page=5`);
  } catch {
    return [];
  }
}

export function isNetlifyConfigured(): boolean {
  return !!process.env.NETLIFY_API_TOKEN;
}
