// 毎朝の Instagram 投稿のあとに、同じ投稿を Threads に連投する（instagram.yml から実行）
// 使い方:
//   node scripts/threads-auto.js                 … 予定表（schedule.json）の今日（日本時間）のフォルダを Threads に連投
//                                                  （Instagram に投稿済みのときだけ。DRY_RUN のときは投稿前でも確認できる）
//   node scripts/threads-auto.js フォルダ名       … 指定フォルダを連投（手動実行・確認用）
//   DRY_RUN=1 を付けると、文章と動画の確認だけで投稿しない（環境変数 DATE=YYYY-MM-DD でその日の予定を確認できる）
// threads.json がなければ post.json から自動で作る（あれば手書きのものを使う）
// 投稿は scripts/threads-thread.js に任せる（二重投稿の防止・途中からの再開もそちら）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildThreadTexts } = require('./threads-lib');

const ROOT = path.join(__dirname, '..');
const POSTS = path.join(ROOT, 'posts');
const { jstDate } = require('./queue-lib');
const { buildSchedule, slotDays } = require('./schedule-lib');

// 予定表の、その日（日本時間）のフォルダ
function scheduledFolder(date) {
  // SLOT=evening のときは18時の枠（なければ朝5時の枠）
  const e = slotDays(buildSchedule({ today: jstDate() }).schedule, process.env.SLOT || 'morning')[date];
  return e && !e.missed ? e.folder : null;
}

function main() {
  const dry = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
  if (process.env.DATE && !dry) throw new Error('日付の指定（DATE）は確認モード（DRY_RUN）のときだけ使えます');
  const date = process.env.DATE || jstDate();
  const folder = process.argv[2] || scheduledFolder(date);
  if (!folder) { console.log(`${date} は予定表に投稿がないため、Threads には投稿しません`); return; }
  const dir = path.join(POSTS, folder);
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
