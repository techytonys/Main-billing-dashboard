import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

const OWNER = 'techytonys';
const REPO = 'Main-billing-dashboard';
const BRANCH = 'main';
const COMMIT_MESSAGE = `Deploy ${new Date().toISOString().split('T')[0]}: PWA support, Schema.org structured data, service worker caching`;

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

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

const IGNORE_PATTERNS = [
  'node_modules', '.git', 'dist', '.cache', '.replit',
  '.config', '.local', '.upm', 'generated-icon.png',
  'backups', '.breakpoints', '.nix', 'scripts/push-to-github.ts',
  'tmp', '.env', 'attached_assets', 'references'
];

function shouldIgnore(filePath: string): boolean {
  const parts = filePath.split('/');
  return parts.some(part => IGNORE_PATTERNS.includes(part)) ||
    filePath.startsWith('.') && filePath !== '.gitignore';
}

function getAllFiles(dir: string, base: string = ''): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    if (shouldIgnore(relPath)) continue;
    if (entry.isDirectory()) {
      files.push(...getAllFiles(path.join(dir, entry.name), relPath));
    } else if (entry.isFile()) {
      files.push(relPath);
    }
  }
  return files;
}

function isBinary(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.svg', '.mp4', '.webm', '.webp'];
  return binaryExts.includes(ext);
}

async function main() {
  console.log('Getting GitHub access token...');
  const token = await getAccessToken();
  const octokit = new Octokit({ auth: token });

  console.log(`Pushing to ${OWNER}/${REPO} (${BRANCH})...`);

  let latestSha: string;
  let baseTreeSha: string;

  try {
    const { data: ref } = await octokit.git.getRef({ owner: OWNER, repo: REPO, ref: `heads/${BRANCH}` });
    latestSha = ref.object.sha;
    const { data: commit } = await octokit.git.getCommit({ owner: OWNER, repo: REPO, commit_sha: latestSha });
    baseTreeSha = commit.tree.sha;
    console.log(`Current HEAD: ${latestSha.substring(0, 7)}`);
  } catch (e: any) {
    console.error('Could not get branch ref. Make sure the repo exists and the branch is set up.');
    throw e;
  }

  const rootDir = '/home/runner/workspace';
  const allFiles = getAllFiles(rootDir);
  console.log(`Found ${allFiles.length} files to push`);

  const treeItems: any[] = [];
  let blobCount = 0;

  for (const filePath of allFiles) {
    const fullPath = path.join(rootDir, filePath);
    const binary = isBinary(fullPath);

    try {
      if (binary) {
        const content = fs.readFileSync(fullPath).toString('base64');
        const { data: blob } = await octokit.git.createBlob({
          owner: OWNER, repo: REPO,
          content, encoding: 'base64'
        });
        treeItems.push({ path: filePath, mode: '100644' as const, type: 'blob' as const, sha: blob.sha });
      } else {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const { data: blob } = await octokit.git.createBlob({
          owner: OWNER, repo: REPO,
          content, encoding: 'utf-8'
        });
        treeItems.push({ path: filePath, mode: '100644' as const, type: 'blob' as const, sha: blob.sha });
      }
      blobCount++;
      if (blobCount % 25 === 0) {
        console.log(`  Uploaded ${blobCount}/${allFiles.length} files...`);
      }
    } catch (e: any) {
      console.warn(`  Skipping ${filePath}: ${e.message}`);
    }
  }

  console.log(`Uploaded ${blobCount} blobs, creating tree...`);

  const { data: newTree } = await octokit.git.createTree({
    owner: OWNER, repo: REPO,
    tree: treeItems,
    base_tree: baseTreeSha
  });

  console.log(`Tree created: ${newTree.sha.substring(0, 7)}`);

  const { data: newCommit } = await octokit.git.createCommit({
    owner: OWNER, repo: REPO,
    message: COMMIT_MESSAGE,
    tree: newTree.sha,
    parents: [latestSha]
  });

  console.log(`Commit created: ${newCommit.sha.substring(0, 7)}`);

  await octokit.git.updateRef({
    owner: OWNER, repo: REPO,
    ref: `heads/${BRANCH}`,
    sha: newCommit.sha
  });

  console.log(`\n✅ Successfully pushed to https://github.com/${OWNER}/${REPO}`);
  console.log(`   Commit: ${newCommit.sha.substring(0, 7)} - ${COMMIT_MESSAGE}`);
}

main().catch(err => {
  console.error('Push failed:', err.message);
  process.exit(1);
});
