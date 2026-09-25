// Instagram 自動投稿スクリプト（GitHub Actions から実行）
// 使い方:
//   node scripts/publish.js                 … 今日（日本時間）の日付の投稿フォルダを投稿
//   node scripts/publish.js 2026-09-28-hiza-taisou   … 指定フォルダを投稿
//   DRY_RUN=1 を付けると、投稿せずに内容の確認だけ行う
// 必要な環境変数: IG_USER_ID, IG_ACCESS_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA（Actions では自動で入る）
const fs = require('fs');
const path = require('path');

const API = 'https://graph.instagram.com/v25.0';
const ROOT = path.join(__dirname, '..');
const POSTS = path.join(ROOT, 'posts');
const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const todayJst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

async function api(method, pathname, params) {
  const url = new URL(API + pathname);
  const body = new URLSearchParams({ ...params, access_token: process.env.IG_ACCESS_TOKEN });
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
    throw new Error(`Instagram API エラー: ${pathname}: ${msg}`);
  }
  return json;
}

async function waitReady(id) {
  for (let i = 0; i < 30; i++) {
    const { status_code } = await api('GET', `/${id}`, { fields: 'status_code' });
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`画像の準備に失敗しました（${status_code}）: ${id}`);
    await sleep(3000);
  }
  throw new Error('画像の準備が時間内に終わりませんでした: ' + id);
}

function duePosts(arg) {
  const all = fs.readdirSync(POSTS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  if (arg) {
    if (!all.includes(arg)) throw new Error('投稿フォルダが見つかりません: posts/' + arg);
    return [arg];
  }
  const today = todayJst();
  return all.filter((n) => n.startsWith(today) && !fs.existsSync(path.join(POSTS, n, 'posted.json')));
}

async function publish(folder) {
  const dir = path.join(POSTS, folder);
  const imgDir = path.join(dir, 'images');
  const jpgs = fs.existsSync(imgDir) ? fs.readdirSync(imgDir).filter((f) => f.endsWith('.jpg')).sort() : [];
  if (!jpgs.length) throw new Error(`JPEG画像がありません。PCで npm run render -- posts/${folder} を実行してから push してください`);
  if (jpgs.length > 10) throw new Error('カルーセルは10枚までです: ' + jpgs.length + '枚');
  const caption = fs.readFileSync(path.join(dir, 'caption.txt'), 'utf8').trim();

  const repo = process.env.GITHUB_REPOSITORY;
  const ref = process.env.GITHUB_SHA || 'main';
  const urls = jpgs.map((f) => `https://raw.githubusercontent.com/${repo}/${ref}/posts/${encodeURIComponent(folder)}/images/${f}`);

  console.log(`▼ ${folder}（${jpgs.length}枚）`);
  urls.forEach((u) => console.log('  ' + u));
  console.log('  キャプション先頭: ' + caption.split('\n')[0]);
  if (DRY) {
    // 投稿はせずに、トークンと画像URLが使えるかだけ確かめる
    for (const u of urls) {
      const r = await fetch(u, { method: 'HEAD' });
      const type = r.headers.get('content-type') || '';
      if (!r.ok || !type.includes('image/jpeg')) throw new Error(`画像を取得できません（${r.status} ${type}）: ${u}`);
    }
    console.log('  画像URL：すべて取得できました');
    if (process.env.IG_ACCESS_TOKEN) {
      const me = await api('GET', '/me', { fields: 'user_id,username' });
      console.log(`  トークン：有効です（@${me.username} / ${me.user_id}）`);
      if (process.env.IG_USER_ID && me.user_id && String(me.user_id) !== String(process.env.IG_USER_ID)) {
        console.log(`  ⚠ IG_USER_ID（${process.env.IG_USER_ID}）とトークンのアカウント（${me.user_id}）が一致しません`);
      }
    }
    console.log('  DRY_RUN のため投稿しません');
    return null;
  }

  const uid = process.env.IG_USER_ID;
  let creationId;
  if (urls.length === 1) {
    const c = await api('POST', `/${uid}/media`, { image_url: urls[0], caption });
    await waitReady(c.id);
    creationId = c.id;
  } else {
    const children = [];
    for (const u of urls) {
      const c = await api('POST', `/${uid}/media`, { image_url: u, is_carousel_item: 'true' });
      children.push(c.id);
    }
    for (const id of children) await waitReady(id);
    const carousel = await api('POST', `/${uid}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption });
    await waitReady(carousel.id);
    creationId = carousel.id;
  }
  const done = await api('POST', `/${uid}/media_publish`, { creation_id: creationId });
  const record = { mediaId: done.id, postedAt: new Date().toISOString(), images: jpgs.length };
  fs.writeFileSync(path.join(dir, 'posted.json'), JSON.stringify(record, null, 2) + '\n');
  console.log('  投稿しました: media id ' + done.id);
  return record;
}

(async () => {
  if (!DRY) {
    for (const k of ['IG_USER_ID', 'IG_ACCESS_TOKEN', 'GITHUB_REPOSITORY']) {
      if (!process.env[k]) throw new Error(`環境変数 ${k} がありません（GitHub の Secrets を確認してください）`);
    }
  }
  const targets = duePosts(process.argv[2]);
  if (!targets.length) { console.log(`今日（${todayJst()}）投稿する予定のフォルダはありません`); return; }
  let failed = 0;
  for (const f of targets) {
    try { await publish(f); } catch (e) { failed++; console.error('✖ ' + f + ': ' + e.message); }
  }
  if (failed) process.exit(1);
})().catch((e) => { console.error(e.message); process.exit(1); });
