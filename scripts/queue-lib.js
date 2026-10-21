// 投稿フォルダの読み込みと日付の共通処理
// 投稿の順番（日付 → フォルダ）は scripts/schedule-lib.js が予定表 schedule.json で決める
const fs = require('fs');
const path = require('path');

const POSTS = path.join(__dirname, '..', 'posts');
// 朝5時の枠：運動 → 知識 → 啓発 のローテーション
const ORDER = ['exercise', 'knowledge', 'awareness'];
const LABEL = { exercise: '運動', knowledge: '知識', awareness: '啓発', nutrition: '栄養', news: '健康ニュース' };
const CAT = { '運動': 'exercise', '運動系': 'exercise', '知識': 'knowledge', '知識系': 'knowledge', '啓発': 'awareness', '啓発系': 'awareness' };
// 20時の枠：運動・知識・啓発以外のイレギュラー発信（栄養枠・○○week など）。色やBGMを決めてあるものはここに書く
const SPECIAL = { '栄養': 'nutrition', '健康ニュース': 'news' };
// カテゴリーごとのひな形（templates/○○.html）。書いていないカテゴリーは carousel
const TEMPLATE = { news: 'news' };

// カテゴリー名 → 英語キー（運動・知識・啓発と SPECIAL 以外は 'special'）
const catKey = (category) => CAT[category] || SPECIAL[category] || 'special';
// 投稿する枠：'morning'（朝5時）か 'evening'（20時）
const slotOf = (category) => (CAT[category] ? 'morning' : 'evening');
const SLOTS = { morning: '朝5時', evening: '20時', 'news-care': '12時（医療・介護ニュース）', 'news-health': '12時15分（健康ニュース）', 'news-ai': '18時（AIニュース）' };

// 気になるニュース（ストック式）：post.json の "newsCategory" で枠が決まる（"newsCategory" がない健康ニュースは今までどおり20時の枠）
//   time は投稿する時刻（日本時間・0時からの分）。作った日に入れられるのは、この時刻＋NEWS_GRACE 分まで（予備の起動が間に合うように）
const NEWS = {
  'news-care': { label: '医療・介護', time: 12 * 60 },
  'news-health': { label: '健康', time: 12 * 60 + 15 },
  'news-ai': { label: 'AI', time: 18 * 60 },
};
const NEWS_SLOT = Object.fromEntries(Object.entries(NEWS).map(([k, v]) => [v.label, k]));
const NEWS_LIFE = 10; // 賞味期限：作った日から10日後まで投稿する（10/21に作ったら10/31まで）
const NEWS_GRACE = 60;
const APP_NEWS_DAYS = 10; // アプリ：作った日の翌日から、その10日後まで表示する
// 投稿する枠（post.json 全体から決める）
const slotOfPost = (post) => NEWS_SLOT[post.newsCategory] || slotOf(post.category);

const jstDate = (d = new Date()) => new Date(new Date(d).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
// 日本時間の0時からの分
const jstMinutes = (d = new Date()) => { const t = new Date(new Date(d).getTime() + 9 * 3600 * 1000); return t.getUTCHours() * 60 + t.getUTCMinutes(); };
const addDays = (ymd, n) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

function loadPosts() {
  return fs.readdirSync(POSTS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(POSTS, d.name, 'post.json')))
    .map((d) => {
      const dir = path.join(POSTS, d.name);
      const post = JSON.parse(fs.readFileSync(path.join(dir, 'post.json'), 'utf8'));
      const slot = slotOfPost(post);
      const postedFile = path.join(dir, 'posted.json');
      const posted = fs.existsSync(postedFile) ? JSON.parse(fs.readFileSync(postedFile, 'utf8')) : null;
      return {
        folder: d.name,
        category: catKey(post.category),
        label: LABEL[catKey(post.category)] || String(post.category || ''),
        slot,
        publishDate: post.publishDate || null,
        // 作った日：post.json の "created"、なければフォルダ名の日付（ストック式のニュースで使う）
        created: isYmd(post.created) ? post.created : (d.name.match(/^\d{4}-\d{2}-\d{2}/) || [null])[0],
        posted,
        post,
      };
    })
    .sort((a, b) => a.folder.localeCompare(b.folder));
}

module.exports = {
  POSTS, ORDER, LABEL, CAT, SPECIAL, TEMPLATE, SLOTS, NEWS, NEWS_SLOT, NEWS_LIFE, NEWS_GRACE, APP_NEWS_DAYS,
  catKey, slotOf, slotOfPost, jstDate, jstMinutes, addDays, isYmd, loadPosts,
};
