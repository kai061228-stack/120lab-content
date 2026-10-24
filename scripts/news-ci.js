// 健康ニュースのプルリクエスト（スマホ・クラウドから作ったもの）のための補助
// GitHub Actions の news-preview.yml と news-publish.yml から使う
//   node scripts/news-ci.js folders < 変更したファイルの一覧   → 健康ニュースのフォルダ名（1行に1つ。投稿済みは除く）
//   node scripts/news-ci.js comment フォルダ名               → プレビューのコメント（Markdown）
//   node scripts/news-ci.js timing                           → 今（日本時間）投稿してよいか（now / wait 秒数 / pending 投稿する時刻）
//   node scripts/news-ci.js pending                          → 翌朝7時待ちで、投稿する時刻になったフォルダ名
//   node scripts/news-ci.js links フォルダ名                  → 投稿のリンク（Markdown）
//   node scripts/news-ci.js stock フォルダ名                  → ストック式のニュース（"newsCategory" あり）なら、マージしたときのコメント（Markdown）。ちがえば何も出さない
//   node scripts/news-ci.js slot フォルダ名                   → ストック式のニュースなら、投稿する枠（news-care・news-health・news-ai）。ちがえば何も出さない
// 環境変数：GITHUB_REPOSITORY、SHA（画像URLの SHA）、REEL_URL・RELEASE_URL（リール動画）、DRY_OK（dry_run の結果）、IG_ACCESS_TOKEN（links）
const fs = require('fs');
const path = require('path');
const { POSTS, catKey, NEWS_SLOT, SLOTS } = require('./queue-lib');
const { buildSchedule, SLOT_KEY } = require('./schedule-lib');
const { buildThreadTexts } = require('./threads-lib');
const { buildTitle } = require('./youtube');

const PENDING = 'news-pending.json';
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const isNews = (folder) => {
  const f = path.join(POSTS, folder, 'post.json');
  return fs.existsSync(f) && catKey(read(f).category) === 'news';
};
const posted = (folder) => fs.existsSync(path.join(POSTS, folder, 'posted.json'));
// ストック式のニュース（"newsCategory" で分野が決まっているもの）の枠。ちがえば null
const stockSlot = (post) => NEWS_SLOT[post.newsCategory] || null;
const onApp = (post) => Boolean(post.app) && Boolean(stockSlot(post));

// ストック式のニュースの投稿予定（予定に入っていなければ day は null）
function stockPlan(folder) {
  const post = read(path.join(POSTS, folder, 'post.json'));
  const slot = stockSlot(post);
  if (!slot) return null;
  const sched = buildSchedule().schedule[SLOT_KEY[slot]] || {};
  const day = Object.keys(sched).find((d) => sched[d].folder === folder && !sched[d].missed) || null;
  return { post, slot, day };
}

// マージしたときのコメント（ストック式のニュースだけ。ちがえば空）
//   マージしたら、すぐ Instagram・Threads に投稿する（news-publish.yml）。アプリは作った日の翌日0時から
function stock(folder) {
  const post = read(path.join(POSTS, folder, 'post.json'));
  if (!stockSlot(post)) return '';
  return [
    `📦 マージしたので、すぐ Instagram・Threads に投稿します（${post.newsCategory}・posts/${folder}。YouTube には上げません）`,
    `- アプリ：${onApp(post) ? `載せます（${appStart(post, folder)} の0時から10日間）` : '載せません'}`,
  ].join('\n');
}

// アプリに出し始める日（作った日の翌日）
function appStart(post, folder) {
  const created = post.created || folder.slice(0, 10);
  const d = new Date(created + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// 変更したファイルの一覧から、健康ニュースのフォルダを選ぶ
function folders(files) {
  const names = new Set();
  for (const line of files.split(/\r?\n/)) {
    const m = line.trim().match(/^posts\/([^/]+)\//);
    if (m) names.add(m[1]);
  }
  return [...names].filter((f) => isNews(f) && !posted(f)).sort();
}

// 日本時間の「時・分」と日付
function jst(now = new Date()) {
  const t = new Date(now.getTime() + 9 * 3600e3);
  return { min: t.getUTCHours() * 60 + t.getUTCMinutes(), ymd: t.toISOString().slice(0, 10), t };
}

// 投稿する時間の決まり
//   22:00〜翌6:00 → 翌朝7:00（pending）／19:30〜20:30 → 20:30 まで待つ（wait）／それ以外 → すぐ（now）
function timing(now = new Date()) {
  const { min, t } = jst(now);
  if (min >= 22 * 60 || min < 6 * 60) {
    const day = new Date(t);
    if (min >= 22 * 60) day.setUTCDate(day.getUTCDate() + 1);
    const ymd = day.toISOString().slice(0, 10);
    return { action: 'pending', postAt: `${ymd}T07:00:00+09:00`, label: `${ymd} 7:00` };
  }
  if (min >= 19 * 60 + 30 && min < 20 * 60 + 30) {
    const wait = (20 * 60 + 30 - min) * 60 - t.getUTCSeconds();
    return { action: 'wait', wait, label: '20:30' };
  }
  return { action: 'now', label: 'すぐ' };
}

// 翌朝7時待ちで、時刻になった（投稿されていない）フォルダ
function pending(now = new Date()) {
  if (!fs.existsSync(POSTS)) return [];
  return fs.readdirSync(POSTS).filter((f) => {
    const p = path.join(POSTS, f, PENDING);
    return fs.existsSync(p) && !posted(f) && new Date(read(p).postAt) <= now;
  }).sort();
}

const block = (s) => '```\n' + s.replace(/```/g, "'''") + '\n```';

function comment(folder) {
  const dir = path.join(POSTS, folder);
  const post = read(path.join(dir, 'post.json'));
  const repo = process.env.GITHUB_REPOSITORY;
  const sha = process.env.SHA || 'main';
  const imgDir = path.join(dir, 'images');
  const pngs = fs.existsSync(imgDir) ? fs.readdirSync(imgDir).filter((f) => f.endsWith('.png')).sort() : [];
  const img = (f) => `https://raw.githubusercontent.com/${repo}/${sha}/posts/${encodeURIComponent(folder)}/images/${f}`;
  const caption = fs.existsSync(path.join(dir, 'caption.txt')) ? fs.readFileSync(path.join(dir, 'caption.txt'), 'utf8').trim() : '（caption.txt がありません）';
  const tf = path.join(dir, 'threads.json');
  let threads;
  let threadsNote = fs.existsSync(tf) ? '手書きの threads.json' : 'post.json から自動で作る文';
  try { threads = fs.existsSync(tf) ? read(tf) : buildThreadTexts(post); } catch (e) { threads = []; threadsNote = '⚠ 作れませんでした：' + e.message; }
  const dry = process.env.DRY_OK === 'success' ? '✅ 画像URL・トークンの確認：問題なし' : `⚠ 画像URL・トークンの確認：失敗（${process.env.DRY_OK || '未実行'}）。Actions のログを確認してください`;

  const out = [
    '<!-- news-preview -->',
    `## 📰 健康ニュースのプレビュー：${folder}`,
    `- ${dry}`,
    ...(stockSlot(post) ? [
      `- 分野：${post.newsCategory}（作った日 ${post.created || folder.slice(0, 10)}）／アプリ：${onApp(post) ? '載せる' : '載せない'}`,
      `- マージすると、すぐ Instagram・Threads に投稿します（YouTube には上げません）${onApp(post) ? `。アプリには ${appStart(post, folder)} の0時から載せます` : ''}`,
    ] : [
      `- 予定日（publishDate）：${post.publishDate || '⚠ ありません'}`,
      '- マージすると、そのまま本番で投稿します（22時〜翌6時のマージは翌朝7時、19時30分〜20時30分のマージは20時30分）',
    ]),
    '',
    '### 画像',
    pngs.map((f) => `<img src="${img(f)}" width="270" alt="${f}">`).join(' ') || '⚠ 画像がありません',
    '',
    '### リール動画',
    process.env.REEL_URL ? `▶ [リール動画を見る（mp4）](${process.env.REEL_URL})　／　[リリースのページ](${process.env.RELEASE_URL})` : '⚠ リール動画を作れませんでした。Actions のログを確認してください',
    '',
    '### キャプション',
    block(caption),
    '',
    `### Threads（${threadsNote}）`,
    ...threads.map((t, i) => `**${i + 1}投稿目**（${[...t].length}字）\n${block(t)}`),
    '',
    '### YouTube ショートのタイトル',
    block(buildTitle(post)),
    '',
    `<sub>コミット ${sha.slice(0, 7)} のプレビュー。直したいときは、同じブランチに push すると作り直されます。</sub>`,
  ];
  return out.join('\n');
}

async function permalink(id) {
  if (!id || !process.env.IG_ACCESS_TOKEN) return null;
  try {
    const u = new URL(`https://graph.instagram.com/v25.0/${id}`);
    u.searchParams.set('fields', 'permalink');
    u.searchParams.set('access_token', process.env.IG_ACCESS_TOKEN);
    const r = await fetch(u);
    const j = await r.json();
    return j.permalink || null;
  } catch (_) { return null; }
}

async function links(folder) {
  const dir = path.join(POSTS, folder);
  const pf = path.join(dir, 'posted.json');
  const tf = path.join(dir, 'threads-posted.json');
  const rec = fs.existsSync(pf) ? read(pf) : null;
  const th = fs.existsSync(tf) ? read(tf) : null;
  const lines = ['<!-- news-published -->', `## 🚀 投稿の結果：${folder}`];
  if (!rec) {
    lines.push('- ⚠ Instagram：投稿されていません。Actions のログを確認してください');
    return lines.join('\n');
  }
  const ig = await permalink(rec.mediaId);
  lines.push(`- Instagram カルーセル：${ig || 'media id ' + rec.mediaId}`);
  if (rec.reelId) lines.push(`- Instagram リール：${(await permalink(rec.reelId)) || 'media id ' + rec.reelId}`);
  else lines.push(`- ⚠ Instagram リール：投稿されていません${rec.reelError ? '（' + rec.reelError + '）' : ''}`);
  if (th && th.ids && th.ids.length >= 3) lines.push(`- Threads（3投稿）：${th.permalink || th.ids.join(', ')}`);
  else lines.push(`- ⚠ Threads：途中で止まりました（${th && th.ids ? th.ids.length : 0}/3）。続きは自動では出しません。出すときは Claude に「Threads の続きを出して」と頼むか、ワークフロー「Threads 連投」を folder=${folder} で実行してください`);
  if (stockSlot(read(path.join(dir, 'post.json')))) lines.push('- YouTube ショート：上げません（気になるニュース）');
  else if (rec.youtubeId) lines.push(`- YouTube ショート：https://youtu.be/${rec.youtubeId}（${rec.youtubePrivacy || ''}）`);
  else lines.push(`- ⚠ YouTube ショート：アップロードされていません${rec.youtubeError ? '（' + rec.youtubeError + '）' : ''}`);
  return lines.join('\n');
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'folders') console.log(folders(fs.readFileSync(0, 'utf8')).join('\n'));
  else if (cmd === 'comment') console.log(comment(arg));
  else if (cmd === 'timing') {
    const r = timing();
    console.log(`action=${r.action}\nwait=${r.wait || 0}\npost_at=${r.postAt || ''}\nlabel=${r.label}`);
  } else if (cmd === 'pending') console.log(pending().join('\n'));
  else if (cmd === 'links') console.log(await links(arg));
  else if (cmd === 'stock') { const s = stock(arg); if (s) console.log(s); }
  else if (cmd === 'slot') { const s = stockSlot(read(path.join(POSTS, arg, 'post.json'))); if (s) console.log(s); }
  else throw new Error('使い方: node scripts/news-ci.js folders|comment|timing|pending|links|stock|slot [フォルダ名]');
}

module.exports = { folders, timing, pending, comment, links, stock, stockPlan, PENDING };
if (require.main === module) main().catch((e) => { console.error('✖ ' + e.message); process.exit(1); });
