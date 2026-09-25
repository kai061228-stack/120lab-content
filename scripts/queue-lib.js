// 投稿の順番を決める共通ルール
//   ・運動 → 知識 → 啓発 → 運動 … の順に1日1件
//   ・同じカテゴリーの中では、フォルダ名の順（古いもの）から
//   ・その日のカテゴリーのストックがなければ、次のカテゴリーから出す
//   ・post.json に "publishDate": "YYYY-MM-DD" があれば、その日に優先して出す（それまでは順番待ちに入れない）
const fs = require('fs');
const path = require('path');

const POSTS = path.join(__dirname, '..', 'posts');
const ORDER = ['exercise', 'knowledge', 'awareness'];
const LABEL = { exercise: '運動', knowledge: '知識', awareness: '啓発' };
const CAT = { '運動': 'exercise', '運動系': 'exercise', '知識': 'knowledge', '知識系': 'knowledge', '啓発': 'awareness', '啓発系': 'awareness' };

const jstDate = (d = new Date()) => new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const addDays = (ymd, n) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

function loadPosts() {
  return fs.readdirSync(POSTS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(POSTS, d.name, 'post.json')))
    .map((d) => {
      const dir = path.join(POSTS, d.name);
      const post = JSON.parse(fs.readFileSync(path.join(dir, 'post.json'), 'utf8'));
      const cat = CAT[post.category] || post.category;
      const postedFile = path.join(dir, 'posted.json');
      const posted = fs.existsSync(postedFile) ? JSON.parse(fs.readFileSync(postedFile, 'utf8')) : null;
      return {
        folder: d.name,
        category: ORDER.includes(cat) ? cat : 'awareness',
        publishDate: post.publishDate || null,
        posted,
      };
    })
    .sort((a, b) => a.folder.localeCompare(b.folder));
}

// 最後に投稿したもの（postedAt が一番新しいもの）
function lastPosted(posts) {
  return posts.filter((p) => p.posted).sort((a, b) => String(a.posted.postedAt).localeCompare(String(b.posted.postedAt))).pop() || null;
}

// その日に出す1件を選ぶ。posts の posted 状態は呼び出し側で管理する
function pick(posts, day, lastCategory) {
  const waiting = posts.filter((p) => !p.posted);
  const pinned = waiting.find((p) => p.publishDate === day);
  if (pinned) return { post: pinned, reason: '日付指定' };
  const pool = waiting.filter((p) => !p.publishDate || p.publishDate < day);
  const start = lastCategory ? (ORDER.indexOf(lastCategory) + 1) % ORDER.length : 0;
  for (let i = 0; i < ORDER.length; i++) {
    const cat = ORDER[(start + i) % ORDER.length];
    const hit = pool.find((p) => p.category === cat);
    if (hit) return { post: hit, reason: i === 0 ? 'ローテーション' : `${LABEL[ORDER[start]]}のストックがないため繰り上げ` };
  }
  return null;
}

// 今日から days 日分の予定を作る（今日すでに投稿済み、または朝の投稿時刻を過ぎていれば明日から）
function plan(days = 14, now = new Date()) {
  const today = jstDate(now);
  const hourJst = new Date(now.getTime() + 9 * 3600 * 1000).getUTCHours();
  const posts = loadPosts();
  const last = lastPosted(posts);
  let lastCategory = last ? last.category : null;
  let day = today;
  if (hourJst >= 9 || (last && jstDate(new Date(last.posted.postedAt)) === today)) day = addDays(today, 1);
  const out = [];
  for (let i = 0; i < days; i++, day = addDays(day, 1)) {
    const r = pick(posts, day, lastCategory);
    if (!r) { out.push({ day, post: null }); continue; }
    out.push({ day, post: r.post, reason: r.reason });
    r.post.posted = { planned: true };
    lastCategory = r.post.category;
  }
  return out;
}

module.exports = { ORDER, LABEL, jstDate, loadPosts, lastPosted, pick, plan };
