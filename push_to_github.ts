import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

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
  'push_to_github.ts', '.config', '.upm', 'generated-icon.png',
  'replit.nix', '.local', '.gitattributes'
];

function shouldIgnore(filePath: string): boolean {
  const parts = filePath.split('/');
  return parts.some(p => IGNORE_PATTERNS.includes(p));
}

function getAllFiles(dir: string, base: string = ''): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = base ? `${base}/${entry.name}` : entry.name;
    
    if (shouldIgnore(relativePath)) continue;
    
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, relativePath));
    } else if (entry.isFile()) {
      try {
        const content = fs.readFileSync(fullPath);
        files.push({ 
          path: relativePath, 
          content: content.toString('base64')
        });
      } catch (e) {
        // skip unreadable files
      }
    }
  }
  return files;
}

async function main() {
  const token = await getAccessToken();
  const octokit = new Octokit({ auth: token });
  
  const owner = 'techytonys';
  const repo = 'Main-billing-dashboard';
  const branch = 'main';

  console.log(`Pushing code to ${owner}/${repo}...`);
  
  // Get the current commit SHA for the branch
  let baseSha: string;
  try {
    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
    baseSha = ref.object.sha;
    console.log(`Current HEAD: ${baseSha.slice(0, 7)}`);
  } catch {
    console.log('Branch not found, creating initial commit...');
    baseSha = '';
  }

  // Get all files
  console.log('Collecting files...');
  const files = getAllFiles('/home/runner/workspace');
  console.log(`Found ${files.length} files to push`);

  // Create blobs for all files
  console.log('Uploading files...');
  const treeItems: any[] = [];
  
  for (let i = 0; i < files.length; i += 15) {
    const batch = files.slice(i, i + 15);
    const blobPromises = batch.map(async (file) => {
      const { data: blob } = await octokit.git.createBlob({
        owner, repo,
        content: file.content,
        encoding: 'base64',
      });
      return { path: file.path, sha: blob.sha };
    });
    
    const results = await Promise.all(blobPromises);
    for (const r of results) {
      treeItems.push({
        path: r.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: r.sha,
      });
    }
    console.log(`  ${Math.min(i + 15, files.length)}/${files.length} files uploaded`);
  }

  // Create tree
  console.log('Creating tree...');
  const { data: tree } = await octokit.git.createTree({
    owner, repo,
    tree: treeItems,
  });

  // Create commit
  console.log('Creating commit...');
  const { data: commit } = await octokit.git.createCommit({
    owner, repo,
    message: 'Pricing section mobile polish, revert hero h1 to original',
    tree: tree.sha,
    parents: baseSha ? [baseSha] : [],
  });

  // Update branch reference
  console.log('Updating branch...');
  try {
    await octokit.git.updateRef({
      owner, repo,
      ref: `heads/${branch}`,
      sha: commit.sha,
      force: true,
    });
  } catch {
    await octokit.git.createRef({
      owner, repo,
      ref: `refs/heads/${branch}`,
      sha: commit.sha,
    });
  }

  console.log(`\nDone! Code pushed to https://github.com/${owner}/${repo}`);
  console.log(`Commit: ${commit.sha.slice(0, 7)}`);
}

main().catch(console.error);
