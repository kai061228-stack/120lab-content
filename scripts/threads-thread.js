// Threads に連投（スレッド）形式で投稿するスクリプト（GitHub Actions から手動で実行）
// 使い方:
//   node scripts/threads-thread.js 2026-09-25-hai-ntm
//   DRY_RUN=1 を付けると、投稿せずに確認だけ行う（リール動画を作って Pages の公開URLまで確認する）
// 投稿する文章は posts/フォルダ名/threads.json（3つの文章の配列）
//   1投稿目：リール動画＋文章　2投稿目：1投稿目への返信　3投稿目：2投稿目への返信
// 投稿後は posts/フォルダ名/threads-posted.json に記録する（二重投稿の防止。途中で失敗したら続きから再開する）
// 必要な環境変数: THREADS_ACCESS_TOKEN, GITHUB_REPOSITORY, GITHUB_TOKEN（Actions では自動で入る）
const fs = require('fs');
const path = require('path');
const { makeReel } = require('./reel');
const { publishToPages, isPublic, loadRecord } = require('./pages-lib');

const API = 'https://graph.threads.net/v1.0';
const ROOT = path.join(__dirname, '..');
const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const MAX_CHARS = 500;

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

// コンテナの準備ができるまで待つ（動画は時間がかかるので最大10分）
async function waitReady(id) {
  for (let i = 0; i < 120; i++) {
    const { status, error_message } = await api('GET', `/${id}`, { fields: 'status,error_message' });
    if (status === 'FINISHED') return;
    if (status === 'ERROR' || status === 'EXPIRED') throw new Error(`投稿の準備に失敗しました（${status}）: ${error_message || id}`);
    await sleep(5000);
  }
  throw new Error('投稿の準備が時間内に終わりませんでした: ' + id);
}

// 1投稿目の動画の公開URLを用意する
// 同じ実行で Instagram のリールに使った動画が公開中なら、そのURLを使い回す（gh-pages を push し直さない）
// 同じ実行でリール動画の公開が間に合わなかったときは、もう一度待っても同じなので、すぐやめて次の実行に任せる
// それ以外（手動実行など）は、reel.mp4 を作って gh-pages に置く（publish.js と同じ方式）
async function prepareVideo(dir, folder) {
  const rec = loadRecord(folder);
  if (rec && !rec.ok) throw new Error(`この実行ではリール動画の公開が間に合わなかったため、Threads は次の実行に任せます（${rec.error}）`);
  if (rec && rec.ok) {
    const r = await isPublic(rec.url);
    if (r.ok) { console.log(`  リールと同じ動画の公開URLを使います: ${rec.url}`); return rec.url; }
    console.log(`  リールの動画URLが使えなくなっていたため（${r.last}）、動画を置き直します`);
  }
  const file = makeReel(dir);
  return publishToPages(file, folder, `threads-${folder}`, `Threads用リール動画: ${folder}`);
}

// 文章のチェック（3投稿・各500字以内・トピックタグは全体で1つ・1投稿目の最後はBGMクレジット）
function checkTexts(texts) {
  if (!Array.isArray(texts) || texts.length !== 3) throw new Error('threads.json は3つの文章の配列にしてください');
  let tags = 0;
  texts.forEach((t, i) => {
    const n = [...t].length;
    if (!t.trim()) throw new Error(`${i + 1}投稿目が空です`);
    if (n > MAX_CHARS) throw new Error(`${i + 1}投稿目が${MAX_CHARS}字を超えています（${n}字）`);
    tags += (t.match(/#\S+/g) || []).length;
  });
  if (tags > 1) throw new Error(`トピックタグは1つだけにしてください（${tags}個）`);
  if (!texts[0].trim().endsWith('BGM：甘茶の音楽工房')) throw new Error('1投稿目の最後は「BGM：甘茶の音楽工房」にしてください');
}

async function main() {
  const folder = process.argv[2];
  if (!folder) throw new Error('フォルダ名を指定してください（例: 2026-09-25-hai-ntm）');
  if (!process.env.THREADS_ACCESS_TOKEN) throw new Error('THREADS_ACCESS_TOKEN がありません（GitHub Secrets に登録してください）');
  const dir = path.join(ROOT, 'posts', folder);
  const textFile = path.join(dir, 'threads.json');
  if (!fs.existsSync(textFile)) throw new Error('文章がありません: posts/' + folder + '/threads.json');
  const texts = JSON.parse(fs.readFileSync(textFile, 'utf8'));
  checkTexts(texts);

  const recFile = path.join(dir, 'threads-posted.json');
  const rec = fs.existsSync(recFile) ? JSON.parse(fs.readFileSync(recFile, 'utf8')) : { ids: [] };
  const save = () => fs.writeFileSync(recFile, JSON.stringify(rec, null, 2) + '\n');

  const me = await api('GET', '/me', { fields: 'id,username' });
  console.log(`▼ ${folder}（Threads @${me.username}）`);
  texts.forEach((t, i) => console.log(`  ${i + 1}投稿目（${[...t].length}字）: ${t.split('\n')[0]}`));
  if (rec.ids.length >= texts.length) { console.log('  3投稿とも投稿済みのため何もしません'); return; }
  if (rec.ids.length) console.log(`  ${rec.ids.length}投稿目まで投稿済み。続きから投稿します`);

  if (DRY) {
    if (!rec.ids.length) await prepareVideo(dir, folder);
    console.log('  DRY_RUN のため投稿しません');
    return;
  }

  for (let i = rec.ids.length; i < texts.length; i++) {
    let params;
    if (i === 0) {
      const videoUrl = await prepareVideo(dir, folder);
      params = { media_type: 'VIDEO', video_url: videoUrl, text: texts[0] };
    } else {
      params = { media_type: 'TEXT', text: texts[i], reply_to_id: rec.ids[i - 1] };
    }
    const c = await api('POST', `/${me.id}/threads`, params);
    await waitReady(c.id);
    const done = await api('POST', `/${me.id}/threads_publish`, { creation_id: c.id });
    rec.ids.push(done.id);
    if (i === 0) rec.postedAt = new Date().toISOString();
    save();
    console.log(`  ${i + 1}投稿目を投稿しました: media id ${done.id}`);
  }
  try {
    const { permalink } = await api('GET', `/${rec.ids[0]}`, { fields: 'permalink' });
    if (permalink) { rec.permalink = permalink; save(); console.log('  URL: ' + permalink); }
  } catch (_) {}
}

main().catch((e) => { console.error('✖ ' + e.message); process.exit(1); });
