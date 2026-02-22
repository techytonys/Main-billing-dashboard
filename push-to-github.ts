import { Octokit } from "@octokit/rest";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) throw new Error('X_REPLIT_TOKEN not found');

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken } }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;
  if (!connectionSettings || !accessToken) throw new Error('GitHub not connected');
  return accessToken;
}

const OWNER = "techytonys";
const REPO = "Main-billing-dashboard";
const BRANCH = "main";
const WORKSPACE = "/home/runner/workspace";

const IGNORE_PATTERNS = [
  /^node_modules\//,
  /^\.git\//,
  /^\.cache\//,
  /^\.local\//,
  /^\.config\//,
  /^\.upm\//,
  /^\.replit$/,
  /^replit\.nix$/,
  /^\.replit\.nix$/,
  /^attached_assets\//,
  /^references\//,
  /^\.gitignore$/,
  /^\.prettierrc$/,
  /^\.eslintrc/,
  /^tmp\//,
  /^backups\//,
];

function shouldInclude(filePath: string): boolean {
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(filePath)) return false;
  }
  return true;
}

function getAllFiles(dir: string, base: string = ""): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(path.join(dir, base), { withFileTypes: true });
    for (const entry of entries) {
      const relative = path.join(base, entry.name);
      if (!shouldInclude(relative)) continue;
      if (entry.isDirectory()) {
        results.push(...getAllFiles(dir, relative));
      } else if (entry.isFile()) {
        results.push(relative);
      }
    }
  } catch (e) {}
  return results;
}

async function main() {
  console.log("Getting GitHub access token...");
  const token = await getAccessToken();
  const octokit = new Octokit({ auth: token });

  console.log(`Pushing to ${OWNER}/${REPO} (${BRANCH})...`);

  // Get current commit SHA
  const { data: ref } = await octokit.git.getRef({ owner: OWNER, repo: REPO, ref: `heads/${BRANCH}` });
  const latestCommitSha = ref.object.sha;
  console.log(`Current HEAD: ${latestCommitSha.substring(0, 8)}`);

  // Get all files to push
  const files = getAllFiles(WORKSPACE);
  console.log(`Found ${files.length} files to push`);

  // Create blobs for all files
  const tree: { path: string; mode: "100644"; type: "blob"; sha: string }[] = [];
  
  let count = 0;
  const batchSize = 10;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(async (filePath) => {
      try {
        const fullPath = path.join(WORKSPACE, filePath);
        const content = fs.readFileSync(fullPath);
        const { data: blob } = await octokit.git.createBlob({
          owner: OWNER, repo: REPO,
          content: content.toString("base64"),
          encoding: "base64",
        });
        count++;
        if (count % 50 === 0) console.log(`  Uploaded ${count}/${files.length} files...`);
        return { path: filePath, mode: "100644" as const, type: "blob" as const, sha: blob.sha };
      } catch (e: any) {
        console.error(`  Skipping ${filePath}: ${e.message}`);
        return null;
      }
    }));
    tree.push(...results.filter(Boolean) as any);
  }

  console.log(`Uploaded ${tree.length} files, creating tree...`);

  // Create tree
  const { data: newTree } = await octokit.git.createTree({
    owner: OWNER, repo: REPO,
    tree,
  });

  // Create commit
  const { data: newCommit } = await octokit.git.createCommit({
    owner: OWNER, repo: REPO,
    message: "Update: Knowledge Base categories/tags with icons, route ordering fix",
    tree: newTree.sha,
    parents: [latestCommitSha],
  });

  // Update branch ref
  await octokit.git.updateRef({
    owner: OWNER, repo: REPO,
    ref: `heads/${BRANCH}`,
    sha: newCommit.sha,
  });

  console.log(`\n✅ Pushed successfully!`);
  console.log(`Commit: ${newCommit.sha.substring(0, 8)}`);
  console.log(`URL: https://github.com/${OWNER}/${REPO}/commit/${newCommit.sha}`);
}

main().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
