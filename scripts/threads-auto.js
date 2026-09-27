// 毎朝の Instagram 投稿のあとに、同じ投稿を Threads に連投する（instagram.yml から実行）
// 使い方:
//   node scripts/threads-auto.js                 … 今日（日本時間）Instagram に投稿したフォルダを Threads に連投
//   node scripts/threads-auto.js フォルダ名       … 指定フォルダを連投（手動実行・確認用）
//   DRY_RUN=1 を付けると、文章と動画の確認だけで投稿しない
// threads.json がなければ post.json から自動で作る（あれば手書きのものを使う）
// 投稿は scripts/threads-thread.js に任せる（二重投稿の防止・途中からの再開もそちら）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildThreadTexts } = require('./threads-lib');

const ROOT = path.join(__dirname, '..');
const POSTS = path.join(ROOT, 'posts');
const jst = (d) => new Date(new Date(d).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);

// 今日（日本時間）Instagram に投稿したフォルダ
function todaysFolder() {
  const today = jst(Date.now());
  const hits = fs.readdirSync(POSTS).filter((f) => {
    const rec = path.join(POSTS, f, 'posted.json');
    if (!fs.existsSync(rec)) return false;
    const { postedAt } = JSON.parse(fs.readFileSync(rec, 'utf8'));
    return postedAt && jst(postedAt) === today;
  });
  return hits.sort().pop() || null;
}

function main() {
  const folder = process.argv[2] || todaysFolder();
  if (!folder) { console.log('今日 Instagram に投稿したフォルダがないため、Threads には投稿しません'); return; }
  const dir = path.join(POSTS, folder);
  const dry = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
  if (!dry && !fs.existsSync(path.join(dir, 'posted.json'))) {
    console.log(`▼ ${folder}：Instagram にまだ投稿されていないため、Threads には投稿しません`);
    return;
  }
  if (fs.existsSync(path.join(dir, 'threads-posted.json'))) {
    const rec = JSON.parse(fs.readFileSync(path.join(dir, 'threads-posted.json'), 'utf8'));
    if ((rec.ids || []).length >= 3) { console.log(`▼ ${folder}：Threads は投稿済みのため何もしません`); return; }
  }

  const textFile = path.join(dir, 'threads.json');
  if (fs.existsSync(textFile)) {
    console.log(`▼ ${folder}：手書きの threads.json を使います`);
  } else {
    const post = JSON.parse(fs.readFileSync(path.join(dir, 'post.json'), 'utf8'));
    const texts = buildThreadTexts(post);
    fs.writeFileSync(textFile, JSON.stringify(texts, null, 2) + '\n');
    console.log(`▼ ${folder}：post.json から threads.json を作りました`);
    texts.forEach((t, i) => console.log(`---- ${i + 1}投稿目（${[...t].length}字）\n${t}`));
    console.log('----');
  }
  execFileSync(process.execPath, [path.join(__dirname, 'threads-thread.js'), folder], { stdio: 'inherit', env: process.env });
}

try { main(); } catch (e) { console.error('✖ ' + e.message); process.exit(1); }
