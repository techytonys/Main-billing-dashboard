const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;
  if (!xReplitToken) throw new Error('X_REPLIT_TOKEN not found');
  const data = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken } }
  ).then(res => res.json());
  const conn = data.items?.[0];
  const accessToken = conn?.settings?.access_token || conn?.settings?.oauth?.credentials?.access_token;
  if (!accessToken) throw new Error('GitHub not connected');
  return accessToken;
}

async function main() {
  const token = await getAccessToken();
  const octokit = new Octokit({ auth: token });
  const owner = 'techytonys';
  const repo = 'Main-billing-dashboard';
  const workspace = '/home/runner/workspace';

  let remoteSha;
  try {
    const ref = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
    remoteSha = ref.data.object.sha;
    console.log('Remote HEAD:', remoteSha);
  } catch(e) {
    remoteSha = null;
  }

  // Get source files only (exclude node_modules, .local, dist etc)
  const allFiles = execSync(
    "find . -type f " +
    "-not -path './node_modules/*' " +
    "-not -path './.local/*' " +
    "-not -path './.git/*' " +
    "-not -path './dist/*' " +
    "-not -path './.cache/*' " +
    "-not -path './.config/*' " +
    "-not -path './attached_assets/*' " +
    "| sed 's|^\\./||'",
    { cwd: workspace, maxBuffer: 10 * 1024 * 1024 }
  ).toString().trim().split('\n').filter(Boolean);

  console.log('Files to push:', allFiles.length);

  const treeItems = [];
  let count = 0;

  for (let i = 0; i < allFiles.length; i += 20) {
    const batch = allFiles.slice(i, i + 20);
    const results = await Promise.all(batch.map(async (file) => {
      try {
        const filePath = path.join(workspace, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory() || stat.size > 50 * 1024 * 1024) return null;
        const content = fs.readFileSync(filePath);
        const blob = await octokit.git.createBlob({
          owner, repo,
          content: content.toString('base64'),
          encoding: 'base64',
        });
        count++;
        if (count % 50 === 0) console.log('  ' + count + '/' + allFiles.length + ' uploaded...');
        return { path: file, mode: '100644', type: 'blob', sha: blob.data.sha };
      } catch(e) { return null; }
    }));
    treeItems.push(...results.filter(Boolean));
  }
  console.log('Uploaded', treeItems.length, 'files total');

  const tree = await octokit.git.createTree({ owner, repo, tree: treeItems });
  console.log('Created tree:', tree.data.sha);

  const commitParams = {
    owner, repo,
    message: 'Update: Community portal tab, notification fixes, 2FA auth, admin-only groups',
    tree: tree.data.sha,
  };
  if (remoteSha) commitParams.parents = [remoteSha];
  const commit = await octokit.git.createCommit(commitParams);
  console.log('Created commit:', commit.data.sha);

  try {
    await octokit.git.updateRef({ owner, repo, ref: 'heads/main', sha: commit.data.sha, force: true });
  } catch(e) {
    await octokit.git.createRef({ owner, repo, ref: 'refs/heads/main', sha: commit.data.sha });
  }
  console.log('Push complete! Code backed up to github.com/' + owner + '/' + repo);
}
main().catch(e => { console.error('Error:', e.message); process.exit(1); });
