// Instagram 自動投稿スクリプト（GitHub Actions から実行）
// 使い方:
//   node scripts/publish.js                 … ローテーション（運動→知識→啓発）で今日の1件を投稿
//   node scripts/publish.js 2026-09-28-hiza-taisou   … 指定フォルダを投稿（カルーセル投稿済みならリールだけ）
//   DRY_RUN=1 を付けると、投稿せずに内容の確認だけ行う（リール動画は作って確認する）
//   カルーセルを投稿したあと、同じ内容のリール（BGM付き動画）も投稿する。REEL=0 でリールを止められる
// 必要な環境変数: IG_USER_ID, IG_ACCESS_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA（Actions では自動で入る）
const fs = require('fs');
const path = require('path');

const API = 'https://graph.instagram.com/v25.0';
const ROOT = path.join(__dirname, '..');
const POSTS = path.join(ROOT, 'posts');
const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const { loadPosts, lastPosted, pick, jstDate, LABEL } = require('./queue-lib');
const { makeReel } = require('./reel');
const BGM_CREDIT = 'BGM：甘茶の音楽工房';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// キャプションのハッシュタグの前に BGM のクレジットを入れる
function reelCaption(caption) {
  const parts = caption.split('\n\n');
  const lastPart = parts[parts.length - 1];
  if (lastPart.trim().startsWith('#')) parts.splice(parts.length - 1, 0, BGM_CREDIT);
  else parts.push(BGM_CREDIT);
  return parts.join('\n\n');
}

async function waitVideo(id) {
  for (let i = 0; i < 60; i++) {
    const { status_code } = await api('GET', `/${id}`, { fields: 'status_code' });
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`動画の処理に失敗しました（${status_code}）: ${id}`);
    await sleep(5000);
  }
  throw new Error('動画の処理が時間内に終わりませんでした: ' + id);
}

async function publishReel(dir, caption) {
  const file = makeReel(dir);
  const size = fs.statSync(file).size;
  const uid = process.env.IG_USER_ID;
  const c = await api('POST', `/${uid}/media`, {
    media_type: 'REELS', upload_type: 'resumable', caption: reelCaption(caption), share_to_feed: 'true',
  });
  const uri = c.uri || `https://rupload.facebook.com/ig-api-upload/v25.0/${c.id}`;
  const up = await fetch(uri, {
    method: 'POST',
    headers: { Authorization: `OAuth ${process.env.IG_ACCESS_TOKEN}`, offset: '0', file_size: String(size) },
    body: fs.readFileSync(file),
  });
  const upJson = await up.json().catch(() => ({}));
  if (!up.ok || upJson.success === false) throw new Error('動画のアップロードに失敗しました: ' + JSON.stringify(upJson));
  await waitVideo(c.id);
  const done = await api('POST', `/${uid}/media_publish`, { creation_id: c.id });
  console.log('  リールを投稿しました: media id ' + done.id);
  return done.id;
}

function duePosts(arg) {
  const posts = loadPosts();
  if (arg) {
    if (!posts.find((p) => p.folder === arg)) throw new Error('投稿フォルダが見つかりません: posts/' + arg);
    return [arg];
  }
  const today = jstDate();
  const last = lastPosted(posts);
  if (last && jstDate(new Date(last.posted.postedAt)) === today) {
    console.log(`今日（${today}）はすでに投稿済みです: ${last.folder}`);
    return [];
  }
  const r = pick(posts, today, last ? last.category : null);
  if (!r) return [];
  console.log(`今日のカテゴリー：${LABEL[r.post.category]}（${r.reason}）`);
  return [r.post.folder];
}

async function publish(folder) {
  const dir = path.join(POSTS, folder);
  const imgDir = path.join(dir, 'images');
  const jpgs = fs.existsSync(imgDir) ? fs.readdirSync(imgDir).filter((f) => f.endsWith('.jpg')).sort() : [];
  if (!jpgs.length) throw new Error(`JPEG画像がありません。PCで npm run render -- posts/${folder} を実行してから push してください`);
  if (jpgs.length > 10) throw new Error('カルーセルは10枚までです: ' + jpgs.length + '枚');
  const caption = fs.readFileSync(path.join(dir, 'caption.txt'), 'utf8').trim();

  // すでにカルーセルを投稿済みのフォルダは、リールだけを出す（まだリールがない場合）
  const postedFile = path.join(dir, 'posted.json');
  if (fs.existsSync(postedFile)) {
    const rec = JSON.parse(fs.readFileSync(postedFile, 'utf8'));
    if (rec.reelId) { console.log(`▼ ${folder}：カルーセル・リールとも投稿済みのため何もしません`); return rec; }
    console.log(`▼ ${folder}：カルーセルは投稿済み（${rec.mediaId}）。リールだけ投稿します`);
    if (DRY) { makeReel(dir); console.log('  DRY_RUN のため投稿しません'); return null; }
    rec.reelId = await publishReel(dir, caption);
    delete rec.reelError;
    fs.writeFileSync(postedFile, JSON.stringify(rec, null, 2) + '\n');
    return rec;
  }

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
    if (process.env.REEL !== '0') {
      makeReel(dir);
      console.log('  リール用キャプションの最後: ' + reelCaption(caption).split('\n\n').slice(-2).join(' / ').slice(0, 60));
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
  const save = () => fs.writeFileSync(path.join(dir, 'posted.json'), JSON.stringify(record, null, 2) + '\n');
  save();
  console.log('  カルーセルを投稿しました: media id ' + done.id);

  if (process.env.REEL !== '0') {
    try {
      record.reelId = await publishReel(dir, caption);
    } catch (e) {
      record.reelError = e.message;
      save();
      throw new Error('カルーセルは投稿済み。リールだけ失敗しました: ' + e.message);
    }
    save();
  }
  return record;
}

(async () => {
  if (!DRY) {
    for (const k of ['IG_USER_ID', 'IG_ACCESS_TOKEN', 'GITHUB_REPOSITORY']) {
      if (!process.env[k]) throw new Error(`環境変数 ${k} がありません（GitHub の Secrets を確認してください）`);
    }
  }
  const targets = duePosts(process.argv[2]);
  if (!targets.length) { console.log(`今日（${jstDate()}）投稿できるストックがありません（npm run queue で確認できます）`); return; }
  let failed = 0;
  for (const f of targets) {
    try { await publish(f); } catch (e) { failed++; console.error('✖ ' + f + ': ' + e.message); }
  }
  if (failed) process.exit(1);
})().catch((e) => { console.error(e.message); process.exit(1); });
