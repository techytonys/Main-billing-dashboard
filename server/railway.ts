const RAILWAY_API = "https://backboard.railway.app/graphql/v2";

function getToken(): string {
  const token = process.env.RAILWAY_API_TOKEN;
  if (!token) throw new Error("RAILWAY_API_TOKEN not configured. Add it in Settings → Secrets.");
  return token;
}

async function railwayGQL(query: string, variables: Record<string, any> = {}): Promise<any> {
  const token = getToken();
  const res = await fetch(RAILWAY_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Railway API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (data.errors?.length) {
    throw new Error(data.errors[0].message || "Railway API error");
  }
  return data.data;
}

export async function createRailwayProject(name: string, repoUrl?: string): Promise<{ projectId: string; serviceId: string; url: string }> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

  const data = await railwayGQL(`
    mutation($name: String!) {
      projectCreate(input: { name: $name }) {
        id
        name
      }
    }
  `, { name: slug });

  const projectId = data.projectCreate.id;

  let serviceId = "";
  if (repoUrl) {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.\s]+)/);
    if (match) {
      const repoPath = `${match[1]}/${match[2].replace(/\.git$/, "")}`;
      const svcData = await railwayGQL(`
        mutation($projectId: String!, $repo: String!, $name: String!) {
          serviceCreate(input: {
            projectId: $projectId,
            name: $name,
            source: { repo: $repo }
          }) {
            id
            name
          }
        }
      `, { projectId, repo: repoPath, name: slug });
      serviceId = svcData.serviceCreate.id;
    }
  } else {
    const svcData = await railwayGQL(`
      mutation($projectId: String!, $name: String!) {
        serviceCreate(input: {
          projectId: $projectId,
          name: $name
        }) {
          id
          name
        }
      }
    `, { projectId, name: slug });
    serviceId = svcData.serviceCreate.id;
  }

  return {
    projectId,
    serviceId,
    url: `https://railway.app/project/${projectId}`,
  };
}

export async function generateRailwayDomain(projectId: string, serviceId: string): Promise<string> {
  const envData = await railwayGQL(`
    query($projectId: String!) {
      project(id: $projectId) {
        environments {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    }
  `, { projectId });

  const envEdges = envData.project?.environments?.edges || [];
  const prodEnv = envEdges.find((e: any) => e.node.name === "production") || envEdges[0];
  if (!prodEnv) throw new Error("No environment found on Railway project");
  const environmentId = prodEnv.node.id;

  const domainData = await railwayGQL(`
    mutation($serviceId: String!, $environmentId: String!) {
      serviceDomainCreate(input: {
        serviceId: $serviceId,
        environmentId: $environmentId
      }) {
        domain
      }
    }
  `, { serviceId, environmentId });

  return `https://${domainData.serviceDomainCreate.domain}`;
}

export async function triggerRailwayDeploy(projectId: string, serviceId: string): Promise<{ id: string; state: string }> {
  const envData = await railwayGQL(`
    query($projectId: String!) {
      project(id: $projectId) {
        environments {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    }
  `, { projectId });

  const envEdges = envData.project?.environments?.edges || [];
  const prodEnv = envEdges.find((e: any) => e.node.name === "production") || envEdges[0];
  if (!prodEnv) throw new Error("No environment found");
  const environmentId = prodEnv.node.id;

  const data = await railwayGQL(`
    mutation($serviceId: String!, $environmentId: String!) {
      serviceInstanceRedeploy(
        serviceId: $serviceId,
        environmentId: $environmentId
      )
    }
  `, { serviceId, environmentId });

  return {
    id: data.serviceInstanceRedeploy || "triggered",
    state: "BUILDING",
  };
}

export async function getRailwayProject(projectId: string): Promise<{ id: string; name: string; url: string; services: any[] }> {
  const data = await railwayGQL(`
    query($projectId: String!) {
      project(id: $projectId) {
        id
        name
        services {
          edges {
            node {
              id
              name
              serviceInstances {
                edges {
                  node {
                    domains {
                      serviceDomains {
                        domain
                      }
                    }
                    latestDeployment {
                      id
                      status
                      createdAt
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `, { projectId });

  const project = data.project;
  const services = (project.services?.edges || []).map((e: any) => e.node);

  return {
    id: project.id,
    name: project.name,
    url: `https://railway.app/project/${project.id}`,
    services,
  };
}

export async function getRailwayDeploys(projectId: string, serviceId: string): Promise<any[]> {
  try {
    const envData = await railwayGQL(`
      query($projectId: String!) {
        project(id: $projectId) {
          environments {
            edges {
              node { id name }
            }
          }
        }
      }
    `, { projectId });

    const envEdges = envData.project?.environments?.edges || [];
    const prodEnv = envEdges.find((e: any) => e.node.name === "production") || envEdges[0];
    if (!prodEnv) return [];

    const data = await railwayGQL(`
      query($projectId: String!) {
        project(id: $projectId) {
          deployments(first: 5) {
            edges {
              node {
                id
                status
                createdAt
              }
            }
          }
        }
      }
    `, { projectId });

    return (data.project?.deployments?.edges || []).map((e: any) => ({
      id: e.node.id,
      state: e.node.status,
      created_at: e.node.createdAt,
    }));
  } catch {
    return [];
  }
}

export async function deleteRailwayProject(projectId: string): Promise<void> {
  await railwayGQL(`
    mutation($projectId: String!) {
      projectDelete(id: $projectId)
    }
  `, { projectId });
}

export function isRailwayConfigured(): boolean {
  return !!process.env.RAILWAY_API_TOKEN;
}
