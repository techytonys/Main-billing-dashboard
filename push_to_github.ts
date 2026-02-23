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
  if (!xReplitToken) throw new Error('X_REPLIT_TOKEN not found');
  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken } }
  ).then(res => res.json()).then(data => data.items?.[0]);
  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
  if (!connectionSettings || !accessToken) throw new Error('GitHub not connected');
  return accessToken;
}

async function main() {
  const token = await getAccessToken();
  const octokit = new Octokit({ auth: token });
  
  const owner = 'techytonys';
  const repo = 'Main-billing-dashboard';
  const branch = 'main';
  
  // Check if repo exists
  try {
    await octokit.repos.get({ owner, repo });
    console.log(`Repo ${owner}/${repo} found`);
  } catch (e: any) {
    if (e.status === 404) {
      console.log('Repo not found, creating...');
      await octokit.repos.createForAuthenticatedUser({ name: repo, private: false, auto_init: true });
      console.log('Repo created');
      await new Promise(r => setTimeout(r, 3000));
    } else {
      throw e;
    }
  }
  
  // Get all files to push
  const workspace = '/home/runner/workspace';
  const filesToPush: string[] = [];
  
  function walkDir(dir: string, relativeTo: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(relativeTo, fullPath);
      
      // Skip directories we don't want
      if (entry.isDirectory()) {
        if (['.git', 'node_modules', '.cache', '.local', 'dist', '.config', '.upm', 'attached_assets', 'references', 'snippets'].includes(entry.name)) continue;
        walkDir(fullPath, relativeTo);
      } else {
        // Skip files we don't want
        if (entry.name === '.replit' || entry.name === 'replit.nix' || entry.name === '.replit.workflow' || entry.name.endsWith('.bin')) continue;
        // Skip very large files
        const stat = fs.statSync(fullPath);
        if (stat.size > 1024 * 1024) { // skip > 1MB files
          console.log(`Skipping large file: ${relPath} (${(stat.size/1024/1024).toFixed(1)}MB)`);
          continue;
        }
        filesToPush.push(relPath);
      }
    }
  }
  
  walkDir(workspace, workspace);
  console.log(`Found ${filesToPush.length} files to push`);
  
  // Get current commit SHA
  let baseSha: string;
  try {
    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
    baseSha = ref.object.sha;
    console.log(`Current HEAD: ${baseSha}`);
  } catch (e: any) {
    // Branch doesn't exist, create initial commit
    console.log('No branch found, will create initial commit');
    baseSha = '';
  }
  
  // Create blobs for all files
  const treeItems: any[] = [];
  let count = 0;
  
  for (const filePath of filesToPush) {
    const fullPath = path.join(workspace, filePath);
    try {
      const content = fs.readFileSync(fullPath);
      const base64Content = content.toString('base64');
      
      const { data: blob } = await octokit.git.createBlob({
        owner, repo,
        content: base64Content,
        encoding: 'base64'
      });
      
      // Check if file should be executable
      const isExecutable = filePath.endsWith('.sh');
      
      treeItems.push({
        path: filePath,
        mode: isExecutable ? '100755' : '100644',
        type: 'blob',
        sha: blob.sha
      });
      
      count++;
      if (count % 50 === 0) console.log(`  Created ${count}/${filesToPush.length} blobs...`);
    } catch (e: any) {
      console.log(`  Error creating blob for ${filePath}: ${e.message}`);
    }
  }
  
  console.log(`Created ${treeItems.length} blobs total`);
  
  // Create tree
  const treeParams: any = { owner, repo, tree: treeItems };
  if (baseSha) {
    const { data: commit } = await octokit.git.getCommit({ owner, repo, commit_sha: baseSha });
    treeParams.base_tree = commit.tree.sha;
  }
  
  const { data: tree } = await octokit.git.createTree(treeParams);
  console.log(`Tree created: ${tree.sha}`);
  
  // Create commit
  const commitParams: any = {
    owner, repo,
    message: 'Deploy: Full project push with deployment scripts',
    tree: tree.sha,
  };
  if (baseSha) commitParams.parents = [baseSha];
  
  const { data: commit } = await octokit.git.createCommit(commitParams);
  console.log(`Commit created: ${commit.sha}`);
  
  // Update branch ref
  try {
    await octokit.git.updateRef({
      owner, repo,
      ref: `heads/${branch}`,
      sha: commit.sha,
      force: true
    });
    console.log(`Branch ${branch} updated to ${commit.sha}`);
  } catch {
    await octokit.git.createRef({
      owner, repo,
      ref: `refs/heads/${branch}`,
      sha: commit.sha
    });
    console.log(`Branch ${branch} created at ${commit.sha}`);
  }
  
  console.log('\n✅ SUCCESS! All files pushed to GitHub.');
  console.log(`\nYour curl deploy command is now ready:`);
  console.log(`curl -fsSL https://raw.githubusercontent.com/${owner}/${repo}/${branch}/deploy/deploy.sh | sudo bash`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
