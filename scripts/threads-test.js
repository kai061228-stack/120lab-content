// Threads のテスト投稿スクリプト（GitHub Actions から手動で実行）
// 使い方:
//   node scripts/threads-test.js "テスト投稿です"
//   DRY_RUN=1 を付けると、投稿せずにトークンとアカウントの確認だけ行う
// 必要な環境変数: THREADS_ACCESS_TOKEN（GitHub Secrets）
// ユーザーIDはトークンから /me で取得する
const API = 'https://graph.threads.net/v1.0';
const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, pathname, params = {}) {
  const url = new URL(API + pathname);
  const body = new URLSearchParams({ ...params, access_token: process.env.THREADS_ACCESS_TOKEN });
  let res;
  if (method === 'GET') {
    for (const [k, v] of body) url.searchParams.set(k, v);
    res = await fetch(url);
  } else {
    res = await fetch(url, { method, body });
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const msg = json.error ? `${json.error.message}（code ${json.error.code}）` : `HTTP ${res.status}`;
    throw new Error(`Threads API エラー: ${pathname}: ${msg}`);
  }
  return json;
}

// コンテナの準備ができるまで待つ（最大1分）
async function waitReady(id) {
  for (let i = 0; i < 12; i++) {
    const { status, error_message } = await api('GET', `/${id}`, { fields: 'status,error_message' });
    if (status === 'FINISHED') return;
    if (status === 'ERROR' || status === 'EXPIRED') throw new Error(`投稿の準備に失敗しました（${status}）: ${error_message || id}`);
    await sleep(5000);
  }
  throw new Error('投稿の準備が時間内に終わりませんでした: ' + id);
}

async function main() {
  if (!process.env.THREADS_ACCESS_TOKEN) throw new Error('THREADS_ACCESS_TOKEN がありません（GitHub Secrets に登録してください）');
  const text = (process.argv[2] || 'テスト投稿です').trim();
  if (!text) throw new Error('投稿する文章が空です');
  if (text.length > 500) throw new Error(`Threads の文章は500文字までです（${text.length}文字）`);

  const me = await api('GET', '/me', { fields: 'id,username' });
  console.log(`アカウント：@${me.username}（ID ${me.id}）`);
  console.log(`文章：${text}`);
  if (DRY) { console.log('DRY_RUN のため投稿しません'); return; }

  const c = await api('POST', `/${me.id}/threads`, { media_type: 'TEXT', text });
  await waitReady(c.id);
  const done = await api('POST', `/${me.id}/threads_publish`, { creation_id: c.id });
  console.log('Threads に投稿しました: media id ' + done.id);
}

main().catch((e) => { console.error('✖ ' + e.message); process.exit(1); });
