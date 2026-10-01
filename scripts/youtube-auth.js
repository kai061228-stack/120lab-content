// YouTube にアップロードするためのリフレッシュトークンを取得する（PC で1回だけ実行）
// 使い方: npm run youtube-auth
//   ブラウザで Google にログインして許可すると、GitHub Secrets に登録する3つの値が画面に表示される
// クライアント情報は下の CLIENT_FILE から読む（リポジトリにはコピーしない）。別の場所なら YT_CLIENT_FILE で指定できる
// スコープは youtube.upload のみ（動画のアップロードだけ）
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');

const CLIENT_FILE = process.env.YT_CLIENT_FILE || 'C:\\Users\\81905\\Documents\\keys\\youtube_client_secret.json';
const SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
const PORT = Number(process.env.YT_AUTH_PORT || 8765);
const REDIRECT = `http://127.0.0.1:${PORT}`;

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

  console.log('認証できました。次の3つを GitHub の Secrets に登録してください（この値はファイルやチャットに残さないでください）。\n');
  console.log('  YT_CLIENT_ID      = ' + client.client_id);
  console.log('  YT_CLIENT_SECRET  = ' + client.client_secret);
  console.log('  YT_REFRESH_TOKEN  = ' + json.refresh_token);
  console.log(`
【登録のしかた（どちらか）】
 A. ブラウザで：GitHub のリポジトリ → Settings → Secrets and variables → Actions
    → 「New repository secret」で、上の名前と値を1つずつ登録する
 B. ターミナルで（1つずつ実行し、聞かれたら値を貼り付けて Enter）:
    gh secret set YT_CLIENT_ID
    gh secret set YT_CLIENT_SECRET
    gh secret set YT_REFRESH_TOKEN

【公開設定（変数 YT_PRIVACY）】
 何も設定しなければ private（非公開）でアップロードされます。
 審査が通ったら、Settings → Secrets and variables → Actions → 「Variables」タブで
 YT_PRIVACY を public にする（または: gh variable set YT_PRIVACY --body public）

※ Google Cloud の「OAuth 同意画面」が「テスト」のままだと、リフレッシュトークンは7日で切れます。
  「本番環境」に公開してから、このコマンドを実行してください。`);
}

main().catch((e) => { console.error('✖ ' + e.message); process.exitCode = 1; });
