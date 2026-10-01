// リール動画を YouTube ショートにもアップロードする（instagram.yml から、Threads のあとに実行）
// 使い方:
//   node scripts/youtube.js                 … 予定表（schedule.json）の今日（日本時間）のフォルダをアップロード
//                                              （Instagram に投稿済みのときだけ。DRY_RUN のときは投稿前でも確認できる）
//   node scripts/youtube.js フォルダ名       … 指定フォルダをアップロード（Instagram・Threads が投稿済みなら YouTube だけ出せる）
//   DRY_RUN=1 を付けると、タイトル・説明・動画の長さを表示するだけでアップロードしない（DATE=YYYY-MM-DD でその日の予定を確認できる）
// 動画は同じ実行の中でリール用に作った posts/フォルダ名/reel.mp4 を使う（なければ作る）
// アップロード後は posted.json に youtubeId を記録する（記録があればアップロードしない）
// YT_OUT_DIR があれば、動画・タイトル・説明文をそこに書き出す（Actions の成果物として手動投稿に使う）
// 必要な環境変数: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN（npm run youtube-auth で取得）
//                YT_PRIVACY（private / unlisted / public。初期値は private）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { jstDate } = require('./queue-lib');
const { buildSchedule } = require('./schedule-lib');
const { makeReel } = require('./reel');
const { reelCaption } = require('./publish');

const ROOT = path.join(__dirname, '..');
const POSTS = path.join(ROOT, 'posts');
const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
const CATEGORY_EDUCATION = '27';
const TITLE_MAX = 100;
const SHORTS = ' #Shorts';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const len = (s) => [...s].length;
// YouTube のタイトル・説明では < と > が使えないため、全角に置き換える
const clean = (s) => s.replace(/</g, '＜').replace(/>/g, '＞');

function privacy() {
  const v = (process.env.YT_PRIVACY || 'private').trim().toLowerCase();
  if (!['private', 'unlisted', 'public'].includes(v)) throw new Error(`YT_PRIVACY は private / unlisted / public のどれかにしてください: ${v}`);
  return v;
}

// 表紙のタイトル（＋サブタイトル）＋「#Shorts」。100文字を超えるときはサブタイトルを削る
function buildTitle(post) {
  // 改行はつなげる。1行目がひらがな以外で終わるとき（「転倒予防の日／バランス体操」など）は区切りにスペースを入れる
  const title = clean((post.cover.title || '').split('\n').map((s) => s.trim()).filter(Boolean)
    .reduce((acc, line) => (!acc ? line : /[ぁ-ゟ]$/.test(acc) ? acc + line : `${acc} ${line}`), ''));
  const sub = clean((post.cover.subtitle || '').replace(/\n/g, '').trim());
  const max = TITLE_MAX - len(SHORTS);
  let t = sub ? `${title}｜${sub}` : title;
  if (len(t) > max) t = title;
  if (len(t) > max) t = [...t].slice(0, max).join('');
  return t + SHORTS;
}

function buildDescription(caption) {
  const d = clean(reelCaption(caption));
  if (Buffer.byteLength(d) > 5000) throw new Error(`説明文が YouTube の上限（5000バイト）を超えています: ${Buffer.byteLength(d)}バイト`);
  return d;
}

// 予定表の、その日（日本時間）のフォルダ
function scheduledFolder(date) {
  const e = buildSchedule({ today: jstDate() }).schedule.days[date];
  return e && !e.missed ? e.folder : null;
}

// 同じ実行でリール用に作った reel.mp4 を使う。ない（または画像より古い）ときは作り直す
function reelFile(dir) {
  const file = path.join(dir, 'reel.mp4');
  if (fs.existsSync(file)) {
    const imgDir = path.join(dir, 'images');
    const newest = Math.max(...fs.readdirSync(imgDir).map((f) => fs.statSync(path.join(imgDir, f)).mtimeMs));
    if (fs.statSync(file).mtimeMs >= newest) { console.log('  リール用の動画を使います: ' + path.relative(ROOT, file)); return file; }
  }
  return makeReel(dir);
}

function duration(file) {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim();
    return Number(out);
  } catch (_) { return NaN; }
}

// 成果物（手動投稿用）：動画・タイトル・説明文
function writeOutputs(folder, file, title, description) {
  const out = process.env.YT_OUT_DIR;
  if (!out) return;
  fs.mkdirSync(out, { recursive: true });
  fs.copyFileSync(file, path.join(out, `${folder}.mp4`));
  fs.writeFileSync(path.join(out, 'title.txt'), title + '\n');
  fs.writeFileSync(path.join(out, 'description.txt'), description + '\n');
  console.log('  成果物（動画・タイトル・説明文）を書き出しました: ' + out);
}

async function accessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.YT_CLIENT_ID,
      client_secret: process.env.YT_CLIENT_SECRET,
      refresh_token: process.env.YT_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(`アクセストークンを取得できません（${json.error || res.status}: ${json.error_description || ''}）。npm run youtube-auth でリフレッシュトークンを取り直してください`);
  }
  return json.access_token;
}

async function apiError(res) {
  const json = await res.json().catch(() => ({}));
  const e = json.error || {};
  const reason = e.errors && e.errors[0] ? `・${e.errors[0].reason}` : '';
  return `HTTP ${res.status}${reason}: ${e.message || ''}`;
}

// 再開可能アップロード（videos.insert）。途中で切れたら、届いた位置から送り直す
async function upload(file, meta, token) {
  const data = fs.readFileSync(file);
  const size = data.length;
  const init = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(size),
      'X-Upload-Content-Type': 'video/mp4',
    },
    body: JSON.stringify(meta),
  });
  if (!init.ok) throw new Error('アップロードの開始に失敗しました: ' + await apiError(init));
  const session = init.headers.get('location');
  if (!session) throw new Error('アップロード先のURLが返ってきませんでした');

  let offset = 0;
  for (let attempt = 1; attempt <= 6; attempt++) {
    let res = null;
    try {
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'video/mp4' };
      if (offset > 0) headers['Content-Range'] = `bytes ${offset}-${size - 1}/${size}`;
      res = await fetch(session, { method: 'PUT', headers, body: data.subarray(offset) });
    } catch (e) {
      console.log(`  送信が途中で切れました（${e.message}）`);
    }
    if (res && (res.status === 200 || res.status === 201)) return (await res.json()).id;
    if (res && res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
      throw new Error('アップロードに失敗しました: ' + await apiError(res));
    }
    if (res) console.log(`  送信が完了しませんでした（HTTP ${res.status}）`);
    await sleep(Math.min(2 ** attempt, 30) * 1000);
    // どこまで届いたかを問い合わせて、続きから送る
    const q = await fetch(session, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Range': `bytes */${size}`, 'Content-Length': '0' },
    }).catch(() => null);
    if (q && (q.status === 200 || q.status === 201)) return (await q.json()).id;
    if (q && q.status === 308) {
      const range = q.headers.get('range');
      offset = range ? Number(range.split('-')[1]) + 1 : 0;
      console.log(`  ${offset} / ${size} バイトまで届いています。続きから送ります（${attempt}回目の再送）`);
    } else if (q && q.status === 404) {
      throw new Error('アップロードの期限が切れました（HTTP 404）。もう一度実行してください');
    }
  }
  throw new Error('アップロードを何度か再送しましたが完了しませんでした');
}

async function main() {
  if (process.env.DATE && !DRY) throw new Error('日付の指定（DATE）は確認モード（DRY_RUN）のときだけ使えます');
  const date = process.env.DATE || jstDate();
  const folder = process.argv[2] || scheduledFolder(date);
  if (!folder) { console.log(`${date} は予定表に投稿がないため、YouTube にはアップロードしません`); return; }
  const dir = path.join(POSTS, folder);
  if (!fs.existsSync(path.join(dir, 'post.json'))) throw new Error('投稿フォルダが見つかりません: posts/' + folder);

  const postedFile = path.join(dir, 'posted.json');
  const rec = fs.existsSync(postedFile) ? JSON.parse(fs.readFileSync(postedFile, 'utf8')) : null;
  if (!DRY && !rec) { console.log(`▼ ${folder}：Instagram にまだ投稿されていないため、YouTube にはアップロードしません`); return; }
  if (rec && rec.youtubeId) { console.log(`▼ ${folder}：YouTube はアップロード済みのため何もしません（https://youtu.be/${rec.youtubeId}）`); return; }

  const post = JSON.parse(fs.readFileSync(path.join(dir, 'post.json'), 'utf8'));
  const caption = fs.readFileSync(path.join(dir, 'caption.txt'), 'utf8').trim();
  const title = buildTitle(post);
  const description = buildDescription(caption);
  const status = privacy();
  console.log(`▼ ${folder}：YouTube ショート`);
  const file = reelFile(dir);
  const secs = duration(file);
  console.log(`  タイトル（${len(title)}文字）: ${title}`);
  console.log(`  動画の長さ: ${Number.isNaN(secs) ? '不明（ffprobe がありません）' : secs.toFixed(1) + '秒'}${secs > 180 ? '  ⚠ 3分を超えるとショートになりません' : ''}`);
  console.log(`  公開設定: ${status}`);
  console.log(`---- 説明（${len(description)}文字）\n${description}\n----`);
  writeOutputs(folder, file, title, description);

  const missing = ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'].filter((k) => !process.env[k]);
  if (DRY) {
    if (!missing.length) { await accessToken(); console.log('  トークン：有効です'); }
    console.log('  DRY_RUN のためアップロードしません');
    return;
  }
  if (missing.length) {
    console.log(`  GitHub の Secrets（${missing.join('・')}）がないため、アップロードしません（npm run youtube-auth で設定できます）`);
    return;
  }

  const meta = {
    snippet: { title, description, categoryId: CATEGORY_EDUCATION, defaultLanguage: 'ja' },
    status: { privacyStatus: status, selfDeclaredMadeForKids: false },
  };
  try {
    const id = await upload(file, meta, await accessToken());
    // ほかのステップが書いた記録を消さないよう、読み直してから追記する
    const latest = JSON.parse(fs.readFileSync(postedFile, 'utf8'));
    Object.assign(latest, { youtubeId: id, youtubeAt: new Date().toISOString(), youtubePrivacy: status });
    delete latest.youtubeError;
    fs.writeFileSync(postedFile, JSON.stringify(latest, null, 2) + '\n');
    console.log(`  YouTube にアップロードしました: https://youtu.be/${id}（${status}）`);
  } catch (e) {
    const latest = JSON.parse(fs.readFileSync(postedFile, 'utf8'));
    latest.youtubeError = e.message;
    fs.writeFileSync(postedFile, JSON.stringify(latest, null, 2) + '\n');
    throw e;
  }
}

module.exports = { buildTitle, buildDescription };
if (require.main === module) {
  main().catch((e) => { console.error('✖ YouTube: ' + e.message); process.exitCode = 1; });
}
