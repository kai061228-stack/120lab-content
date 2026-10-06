// 投稿フォルダの読み込みと日付の共通処理
// 投稿の順番（日付 → フォルダ）は scripts/schedule-lib.js が予定表 schedule.json で決める
const fs = require('fs');
const path = require('path');

const POSTS = path.join(__dirname, '..', 'posts');
// 朝5時の枠：運動 → 知識 → 啓発 のローテーション
const ORDER = ['exercise', 'knowledge', 'awareness'];
const LABEL = { exercise: '運動', knowledge: '知識', awareness: '啓発', nutrition: '栄養' };
const CAT = { '運動': 'exercise', '運動系': 'exercise', '知識': 'knowledge', '知識系': 'knowledge', '啓発': 'awareness', '啓発系': 'awareness' };
// 18時の枠：運動・知識・啓発以外のイレギュラー発信（栄養枠・○○week など）。色やBGMを決めてあるものはここに書く
const SPECIAL = { '栄養': 'nutrition' };

// カテゴリー名 → 英語キー（運動・知識・啓発と SPECIAL 以外は 'special'）
const catKey = (category) => CAT[category] || SPECIAL[category] || 'special';
// 投稿する枠：'morning'（朝5時）か 'evening'（18時）
const slotOf = (category) => (CAT[category] ? 'morning' : 'evening');
const SLOTS = { morning: '朝5時', evening: '18時' };

const jstDate = (d = new Date()) => new Date(new Date(d).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const addDays = (ymd, n) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

function loadPosts() {
  return fs.readdirSync(POSTS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(POSTS, d.name, 'post.json')))
    .map((d) => {
      const dir = path.join(POSTS, d.name);
      const post = JSON.parse(fs.readFileSync(path.join(dir, 'post.json'), 'utf8'));
      const slot = slotOf(post.category);
      const postedFile = path.join(dir, 'posted.json');
      const posted = fs.existsSync(postedFile) ? JSON.parse(fs.readFileSync(postedFile, 'utf8')) : null;
      return {
        folder: d.name,
        category: catKey(post.category),
        label: LABEL[catKey(post.category)] || String(post.category || ''),
        slot,
        publishDate: post.publishDate || null,
        posted,
        post,
      };
    })
    .sort((a, b) => a.folder.localeCompare(b.folder));
}

module.exports = { POSTS, ORDER, LABEL, CAT, SPECIAL, SLOTS, catKey, slotOf, jstDate, addDays, isYmd, loadPosts };
