// YouTube にアップロードするためのリフレッシュトークンを取得する（PC で1回だけ実行）
// 使い方: npm run youtube-auth
//   ブラウザで Google にログインして許可すると、3つの値（YT_CLIENT_ID・YT_CLIENT_SECRET・YT_REFRESH_TOKEN）を
//   gh secret set で GitHub Secrets に直接登録する（値は画面に表示しない。gh にログインしておくこと）
// YT_CLIENT_ID・YT_CLIENT_SECRET は下の CLIENT_FILE から読む（リポジトリにはコピーしない）。別の場所なら YT_CLIENT_FILE で指定できる
// スコープは youtube.upload のみ（動画のアップロードだけ）
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const { execFile, execFileSync } = require('child_process');

const CLIENT_FILE = process.env.YT_CLIENT_FILE || 'C:\\Users\\81905\\Documents\\keys\\youtube_client_secret.json';
const SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
const PORT = Number(process.env.YT_AUTH_PORT || 8765);
const REDIRECT = `http://127.0.0.1:${PORT}`;
const ROOT = path.join(__dirname, '..');

// gh が使えるか、ログインの前に確かめる
function checkGh() {
  try { execFileSync('gh', ['auth', 'status'], { cwd: ROOT, stdio: 'ignore' }); } catch (_) {
    throw new Error('gh が使えません。gh auth login で GitHub にログインしてから、もう一度実行してください');
  }
}

// 値はコマンドの引数ではなく標準入力で渡す（画面やプロセス一覧に出さない）
function setSecret(name, value) {
  try {
    execFileSync('gh', ['secret', 'set', name], { cwd: ROOT, input: value, stdio: ['pipe', 'ignore', 'pipe'] });
  } catch (e) {
    throw new Error(`${name} を登録できませんでした: ${(e.stderr || '').toString().trim()}`);
  }
}

function loadClient() {
  if (!fs.existsSync(CLIENT_FILE)) throw new Error('クライアント情報のファイルが見つかりません: ' + CLIENT_FILE);
  const json = JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf8'));
  const c = json.installed || json.web;
  if (!c || !c.client_id || !c.client_secret) throw new Error('クライアント情報の形式が違います（installed または web の client_id / client_secret が必要）');
  if (json.web) console.log(`※ ウェブアプリ用のクライアントです。承認済みのリダイレクトURIに ${REDIRECT} を登録しておいてください（デスクトップアプリ用なら不要）\n`);
  return c;
}

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  execFile(cmd[0], cmd[1], () => {});
}

// ブラウザから戻ってきた認可コードを受け取る
function waitCode(state) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, REDIRECT);
      if (u.pathname !== '/') { res.writeHead(404); res.end(); return; }
      const err = u.searchParams.get('error');
      const code = u.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (err || !code || u.searchParams.get('state') !== state) {
        res.end('<p>認証できませんでした。ターミナルを確認してください。</p>');
        server.close();
        reject(new Error('認証できませんでした: ' + (err || 'コードがありません')));
        return;
      }
      res.end('<p>認証できました。この画面は閉じて、ターミナルに戻ってください。</p>');
      server.close();
      resolve(code);
    });
    server.on('error', (e) => reject(new Error(`ポート ${PORT} を使えません（${e.code}）。YT_AUTH_PORT で別の番号を指定してください`)));
    server.listen(PORT, '127.0.0.1');
    setTimeout(() => { server.close(); reject(new Error('5分以内に認証が終わらなかったため終了しました')); }, 5 * 60 * 1000).unref();
  });
}

async function main() {
  // ブラウザでのログインは PC だけ。Actions などでは動かさない
  if (process.env.GITHUB_ACTIONS || process.env.CI) throw new Error('npm run youtube-auth は PC で実行してください（Actions ではブラウザでのログインはできません）');
  checkGh();
  const client = loadClient();
  const state = crypto.randomBytes(16).toString('hex');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  Object.entries({
    client_id: client.client_id, redirect_uri: REDIRECT, response_type: 'code', scope: SCOPE,
    access_type: 'offline', prompt: 'consent', state, code_challenge: challenge, code_challenge_method: 'S256',
  }).forEach(([k, v]) => auth.searchParams.set(k, v));

  const codePromise = waitCode(state);
  console.log('ブラウザで Google にログインし、YouTube チャンネルのアカウントを選んで「許可」してください。');
  console.log('ブラウザが開かないときは、次のURLを開いてください:\n' + auth + '\n');
  openBrowser(auth.toString());
  const code = await codePromise;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      code, client_id: client.client_id, client_secret: client.client_secret,
      redirect_uri: REDIRECT, grant_type: 'authorization_code', code_verifier: verifier,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`トークンを取得できませんでした: ${json.error || res.status} ${json.error_description || ''}`);
  if (!json.refresh_token) throw new Error('リフレッシュトークンが返ってきませんでした。https://myaccount.google.com/permissions でこのアプリのアクセスを削除してから、もう一度実行してください');

  setSecret('YT_CLIENT_ID', client.client_id.trim());
  setSecret('YT_CLIENT_SECRET', client.client_secret.trim());
  setSecret('YT_REFRESH_TOKEN', json.refresh_token.trim());
  console.log('3つ登録しました');
}

main().catch((e) => { console.error('✖ ' + e.message); process.exitCode = 1; });
