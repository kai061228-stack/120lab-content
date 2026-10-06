// リール動画を GitHub Pages（gh-pages ブランチ）に置いて公開URLを作る処理（publish.js と threads-thread.js で共用）
// gh-pages は毎回「今回の動画1本＋site/ のページ」の状態で上書きする（履歴や容量が増えないように）
// 同じ実行の中で Instagram のリールに使った公開URLは、記録ファイル（RUNNER_TEMP/pages-reel.json）に残し、
// Threads はそれを使い回す（gh-pages を push し直すと、公開中の動画が消えて Pages の反映待ちがもう一度必要になるため）
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { copySite } = require('./site-lib');

const ROOT = path.join(__dirname, '..');
const REC = path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'pages-reel.json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// file を gh-pages に置き、公開URLと push したコミットの SHA を返す
// name は reels/ の下のファイル名（拡張子なし）、message はコミットメッセージ
function uploadToPages(file, name, message) {
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
  if (!owner || !repo) throw new Error('GITHUB_REPOSITORY がないため、動画の公開URLを作れません');
  const rel = `reels/${name}-${Date.now()}.mp4`;
  const tmp = path.join(os.tmpdir(), 'gh-pages-upload');
  const git = (args, cwd = ROOT) => execFileSync('git', args, { cwd, stdio: 'pipe' });
  fs.rmSync(tmp, { recursive: true, force: true });
  git(['worktree', 'prune']);
  git(['worktree', 'add', '--detach', tmp]);
  let sha;
  try {
    git(['checkout', '--orphan', 'gh-pages-upload'], tmp);
    git(['rm', '-rf', '--quiet', '.'], tmp);
    fs.mkdirSync(path.join(tmp, 'reels'), { recursive: true });
    fs.copyFileSync(file, path.join(tmp, rel));
    // ホームページ・プライバシーポリシー（site/）も毎回置き直す
    copySite(tmp);
    git(['add', '-A'], tmp);
    git(['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com',
      'commit', '--quiet', '-m', message], tmp);
    sha = git(['rev-parse', 'HEAD'], tmp).toString().trim();
    git(['push', '--force', '--quiet', 'origin', 'HEAD:refs/heads/gh-pages'], tmp);
  } finally {
    git(['worktree', 'remove', '--force', tmp]);
    try { git(['branch', '-D', 'gh-pages-upload']); } catch (_) {}
  }
  return { url: `https://${owner}.github.io/${repo}/${rel}`, sha };
}

// Pages の再構築は、gh-pages への push で自動的に始まる
// 自動で始まらなかったとき（30秒待っても、そのコミットのビルドが見つからないとき）だけ、再構築を頼む
// （両方起動すると、片方が取り消されて「Page build failed」が毎回残るため）
async function ensurePagesBuild(sha) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return;
  const api = `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/pages/builds`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };
  for (let i = 0; i < 10; i++) {
    await sleep(3000);
    const res = await fetch(`${api}/latest`, { headers }).catch(() => null);
    if (!res || !res.ok) break;
    const b = await res.json().catch(() => ({}));
    if (b.commit === sha) { console.log(`  Pages の反映が始まりました（${b.status}）`); return; }
  }
  console.log('  Pages の反映が自動で始まらないため、再構築を頼みます');
  const res = await fetch(api, { method: 'POST', headers }).catch(() => null);
  if (res && !res.ok) console.log(`  （Pages の再構築依頼: HTTP ${res.status}。自動の反映を待ちます）`);
}

// 公開URLが 200 で video/mp4 を返すか
async function isPublic(url) {
  const res = await fetch(url, { method: 'HEAD', cache: 'no-store' }).catch(() => null);
  const type = res ? res.headers.get('content-type') || '' : '';
  return { ok: !!res && res.status === 200 && type.startsWith('video/mp4'), last: res ? `HTTP ${res.status} ${type}` : '接続できません' };
}

// 公開URLが 200 で video/mp4 を返すようになるまで待つ（最大10分）
async function waitPublicUrl(url) {
  let last = '';
  for (let i = 0; i < 60; i++) {
    const r = await isPublic(url);
    last = r.last;
    if (r.ok) {
      console.log(`  動画の公開URLを確認しました（${last}）: ${url}`);
      return;
    }
    if (i % 6 === 0) console.log(`  動画の公開を待っています…（${last}）`);
    await sleep(10000);
  }
  throw new Error(`動画の公開URLが10分以内に使えるようになりませんでした（最後: ${last}）: ${url}`);
}

// file を gh-pages に置き、公開URLで見られるようになるまで待つ
// 結果（使えたURL、または Pages の反映が間に合わなかったこと）を記録ファイルに残す
async function publishToPages(file, folder, name, message) {
  const { url, sha } = uploadToPages(file, name, message);
  await ensurePagesBuild(sha);
  try {
    await waitPublicUrl(url);
  } catch (e) {
    saveRecord({ folder, url, ok: false, error: e.message });
    throw e;
  }
  saveRecord({ folder, url, ok: true });
  return url;
}

function saveRecord(rec) {
  try { fs.writeFileSync(REC, JSON.stringify({ ...rec, at: new Date().toISOString() }, null, 2) + '\n'); } catch (_) {}
}

// 同じ実行の中で、このフォルダの動画を Pages に置いた結果（なければ null）
function loadRecord(folder) {
  try {
    const rec = JSON.parse(fs.readFileSync(REC, 'utf8'));
    return rec.folder === folder ? rec : null;
  } catch (_) { return null; }
}

module.exports = { publishToPages, isPublic, loadRecord };
