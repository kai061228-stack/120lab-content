// 投稿予定表（schedule.json）とアプリ用データ（app-feed/feed.json）を作る
//
// 予定表の決め方
//   1. 投稿済みのフォルダは、実際に投稿した日（日本時間）に固定する
//      ・予定日より前に手動で投稿したものは投稿した日に移り、元の予定日は空きになる（5 でストックから埋める）
//      ・同じ日に2件以上投稿したときは、その日の予定だったものを本体にし、残りは extra に記録する
//   2. 今日より前の日付は変えない（投稿されずに過ぎた予定は missed として記録に残し、その投稿はストックに戻す）
//   3. 今日以降ですでに決まっている予定は動かさない（予定が入っている今日は、何があっても変えない）
//   4. post.json の "publishDate" は優先する。その日に自動で入っていた投稿は、空いている一番早い日に移す
//   5. 空いている日を、今日（空いていれば）から順に埋める
//      ・運動 → 知識 → 啓発 の順（前の日のカテゴリーの次）。カテゴリー内はフォルダ名の順（古いもの）から
//      ・その日のカテゴリーのストックがなければ、次のカテゴリーから繰り上げ
//      ・publishDate がまだ先の投稿は使わない
//
// 20時の枠（運動・知識・啓発以外のイレギュラー発信。栄養枠・○○week など）は、別の予定（schedule.json の evening）にする
//   ・投稿済みは、実際に投稿した日に固定する。今日より前で投稿されなかった予定は missed として記録に残す
//   ・まだの投稿は、post.json の "publishDate" の日にだけ入れる（ローテーションや繰り上げはしない）
//   ・publishDate がない・過ぎている・同じ日にほかの投稿があるときは、予定に入れずに知らせる
//
// 気になるニュース（ストック式。post.json に "newsCategory" があるもの）は、分野ごとに別の予定にする（buildNews）
//   医療・介護 → newsCare（20:15）、健康 → newsHealth（20:30）、AI → newsAi（20:45）
//   ・毎日1件ずつ、作った日の古いものから出す。ストックがない日はお休み
//   ・作った日から10日（NEWS_LIFE）を過ぎたものは出さない
// アプリ用ニュース（app-feed/news.json）は、"app": true のニュース（AI 以外）を、作った日の翌日から10日後まで載せる
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  POSTS, ORDER, LABEL, CAT, NEWS, NEWS_SLOT, NEWS_LIFE, APP_NEWS_DAYS,
  jstDate, jstMinutes, addDays, isYmd, loadPosts,
} = require('./queue-lib');

// 枠 → schedule.json の中の場所
const SLOT_KEY = { morning: 'days', evening: 'evening', 'news-care': 'newsCare', 'news-health': 'newsHealth', 'news-ai': 'newsAi' };

const ROOT = path.join(__dirname, '..');
const SCHEDULE_FILE = path.join(ROOT, 'schedule.json');
const FEED_FILE = path.join(ROOT, 'app-feed', 'feed.json');
const NEWS_FEED_FILE = path.join(ROOT, 'app-feed', 'news.json');
const FEED_DAYS = 8; // 今日から7日先まで

function readSchedule() {
  if (!fs.existsSync(SCHEDULE_FILE)) return { days: {} };
  return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
}

// その日に出す1件をストックから選ぶ
function pick(pool, day, lastCategory) {
  const ok = pool.filter((p) => !isYmd(p.publishDate) || p.publishDate <= day);
  const pinned = ok.find((p) => p.publishDate === day);
  if (pinned) return { post: pinned, reason: '日付指定' };
  const start = lastCategory ? (ORDER.indexOf(lastCategory) + 1) % ORDER.length : 0;
  for (let i = 0; i < ORDER.length; i++) {
    const cat = ORDER[(start + i) % ORDER.length];
    const hit = ok.find((p) => p.category === cat);
    if (hit) return { post: hit, reason: i === 0 ? 'ローテーション' : `${LABEL[ORDER[start]]}のストックがないため繰り上げ` };
  }
  return null;
}

// d より前で一番近い予定のカテゴリー（30日前まで見る）
function prevCategory(days, d) {
  for (let i = 1; i <= 30; i++) {
    const e = days[addDays(d, -i)];
    if (e) return CAT[e.category] || null;
  }
  return null;
}

// 予定表を作る（ファイルには書かない）。warnings は運営者に知らせること、moves は日付が変わった投稿
// now はストック式のニュースで「今日の投稿時刻を過ぎたか」を見るのに使う
function buildSchedule({ today = jstDate(), now = new Date(), prev = readSchedule(), posts: allPosts = loadPosts() } = {}) {
  const posts = allPosts.filter((p) => p.slot === 'morning');
  const byFolder = new Map(posts.map((p) => [p.folder, p]));
  const prevDays = prev.days || {};
  const days = {};
  const assigned = new Set();
  const warnings = [];
  const entry = (p, reason, extra = {}) => ({ folder: p.folder, category: LABEL[p.category], reason, ...extra });

  // 1. 投稿済み：実際に投稿した日に固定
  const postedByDay = {};
  for (const p of posts) {
    if (p.posted && p.posted.postedAt) (postedByDay[jstDate(p.posted.postedAt)] ||= []).push(p);
  }
  for (const [d, list] of Object.entries(postedByDay)) {
    list.sort((a, b) => String(a.posted.postedAt).localeCompare(String(b.posted.postedAt)));
    const pe = prevDays[d];
    const planned = pe && byFolder.get(pe.folder);
    let e;
    if (planned && list.includes(planned)) {
      e = entry(planned, pe.reason, { posted: true });
    } else if (d === today && planned && !planned.posted) {
      // 今日の予定がまだ投稿前のうちに、別の投稿を手動で出した場合：今日の予定はそのまま
      e = entry(planned, pe.reason);
      assigned.add(planned.folder);
    } else {
      e = entry(list[0], pe ? '手動で投稿' : '投稿済み', { posted: true });
    }
    const extra = list.filter((p) => p.folder !== e.folder).map((p) => p.folder);
    if (extra.length) e.extra = extra;
    days[d] = e;
    list.forEach((p) => assigned.add(p.folder));
  }

  // 2. 今日より前：記録として残す（投稿されなかった予定は missed）
  for (const [d, pe] of Object.entries(prevDays)) {
    if (d >= today || days[d]) continue;
    const { posted, extra, ...rest } = pe;
    days[d] = { ...rest, missed: true };
  }

  // 3. 今日以降で決まっている予定を残す（消えたフォルダ・投稿済み・ほかの日に入ったものは空きにする）
  for (const d of Object.keys(prevDays).sort()) {
    if (d < today || days[d]) continue;
    const p = byFolder.get(prevDays[d].folder);
    if (!p || p.posted || assigned.has(p.folder)) continue;
    days[d] = entry(p, prevDays[d].reason);
    assigned.add(p.folder);
  }

  // 4. publishDate を優先する
  const dayOf = (folder) => Object.keys(days).find((d) => d >= today && days[d].folder === folder && !days[d].missed);
  const pinned = posts
    .filter((p) => !p.posted && isYmd(p.publishDate) && p.publishDate >= today)
    .sort((a, b) => a.publishDate.localeCompare(b.publishDate) || a.folder.localeCompare(b.folder));
  for (const p of pinned) {
    const P = p.publishDate;
    const cur = dayOf(p.folder);
    if (cur === P) continue;
    if (cur === today) { warnings.push(`${p.folder}：今日の予定に入っているため、publishDate（${P}）には移しません`); continue; }
    const occ = days[P];
    if (occ) {
      const q = byFolder.get(occ.folder);
      if (P === today || occ.posted || (q && q.publishDate === P)) {
        warnings.push(`${p.folder}：publishDate（${P}）には ${occ.folder} が決まっているため、その日には入れられません`);
        continue;
      }
      delete days[P];
      assigned.delete(occ.folder);
    }
    if (cur) delete days[cur];
    days[P] = entry(p, '日付指定');
    assigned.add(p.folder);
  }

  // 5. 空いている日を埋める
  const pool = posts.filter((p) => !p.posted && !assigned.has(p.folder));
  const lastFixed = Object.keys(days).sort().pop() || today;
  for (let d = today; pool.length || d <= lastFixed; d = addDays(d, 1)) {
    if (d > addDays(today, 730)) break;
    if (days[d] || !pool.length) continue;
    const r = pick(pool, d, prevCategory(days, d));
    if (!r) continue;
    days[d] = entry(r.post, r.reason);
    pool.splice(pool.indexOf(r.post), 1);
  }
  pool.forEach((p) => warnings.push(`${p.folder}：予定に入れられませんでした`));

  // 日付が変わった投稿（今日以降の予定だけ比べる）
  const moves = [];
  for (const [d, pe] of Object.entries(prevDays)) {
    if (d < today || pe.missed) continue;
    const now = Object.keys(days).find((x) => (days[x].folder === pe.folder || (days[x].extra || []).includes(pe.folder)) && !days[x].missed && (x >= today || days[x].posted));
    if (now !== d) moves.push({ folder: pe.folder, from: d, to: now || null });
  }

  const evening = buildEvening({ today, prevDays: prev.evening || {}, posts: allPosts.filter((p) => p.slot === 'evening'), warnings });
  const news = {};
  for (const slot of Object.keys(NEWS)) {
    const key = SLOT_KEY[slot];
    news[key] = buildNews({ slot, today, now, prevDays: prev[key] || {}, posts: allPosts.filter((p) => p.slot === slot), warnings });
  }
  return { schedule: { days: sortKeys(days), evening, ...news }, warnings, moves };
}

function sortKeys(obj) {
  const sorted = {};
  Object.keys(obj).sort().forEach((k) => { sorted[k] = obj[k]; });
  return sorted;
}

// 20時の枠の予定を作る（決め方はファイルの先頭）
function buildEvening({ today, prevDays, posts, warnings }) {
  const days = {};
  const entry = (p, reason, extra = {}) => ({ folder: p.folder, category: p.label, reason, ...extra });

  // 投稿済み：実際に投稿した日に固定
  const postedByDay = {};
  for (const p of posts) {
    if (p.posted && p.posted.postedAt) (postedByDay[jstDate(p.posted.postedAt)] ||= []).push(p);
  }
  for (const [d, list] of Object.entries(postedByDay)) {
    list.sort((a, b) => String(a.posted.postedAt).localeCompare(String(b.posted.postedAt)));
    days[d] = entry(list[0], list[0].publishDate === d ? '日付指定' : '投稿済み', { posted: true });
    const extra = list.slice(1).map((p) => p.folder);
    if (extra.length) days[d].extra = extra;
  }

  // 今日より前：記録として残す（投稿されなかった予定は missed）
  for (const [d, pe] of Object.entries(prevDays)) {
    if (d >= today || days[d]) continue;
    const { posted, extra, ...rest } = pe;
    days[d] = { ...rest, missed: true };
  }

  // まだの投稿：publishDate の日に入れる
  for (const p of posts) {
    if (p.posted) continue;
    const P = p.publishDate;
    if (!p.post.category) warnings.push(`${p.folder}：post.json に "category" がありません（20時の枠として扱います）`);
    if (!isYmd(P)) { warnings.push(`${p.folder}：20時の枠の投稿には "publishDate" が必要です（予定に入っていません）`); continue; }
    if (P < today) { warnings.push(`${p.folder}：publishDate（${P}）を過ぎています。新しい日付を書いてください`); continue; }
    if (days[P]) { warnings.push(`${p.folder}：${P} の20時には ${days[P].folder} が入っているため、予定に入れられません`); continue; }
    days[P] = entry(p, '日付指定');
  }
  return sortKeys(days);
}

// 気になるニュース（ストック式）の、ひとつの分野の予定を作る
//   ・投稿済みは、実際に投稿した日に固定する。今日より前で投稿されなかった予定は missed として残し、その投稿はストックに戻す
//   ・予定が入っている今日は変えない（時刻を過ぎても、予備の起動で出せる）。今日が空いていれば、投稿する時刻より前のときだけ入れる
//   ・空いている日に、作った日の古いものから1日1件ずつ入れる（作った日より前の日には入れない）
//   ・作った日から NEWS_LIFE 日を過ぎる日には入れない（期限切れ）
function buildNews({ slot, today, now, prevDays, posts, warnings }) {
  const { label, time } = NEWS[slot];
  const days = {};
  const assigned = new Set();
  const byFolder = new Map(posts.map((p) => [p.folder, p]));
  const expires = (p) => addDays(p.created, NEWS_LIFE);
  const entry = (p, reason, extra = {}) => ({ folder: p.folder, category: label, reason, created: p.created, expires: expires(p), ...extra });

  // 投稿済み：実際に投稿した日に固定
  const postedByDay = {};
  for (const p of posts) {
    if (p.posted && p.posted.postedAt) (postedByDay[jstDate(p.posted.postedAt)] ||= []).push(p);
  }
  for (const [d, list] of Object.entries(postedByDay)) {
    list.sort((a, b) => String(a.posted.postedAt).localeCompare(String(b.posted.postedAt)));
    days[d] = entry(list[0], (prevDays[d] && prevDays[d].folder === list[0].folder && prevDays[d].reason) || '投稿済み', { posted: true });
    const extra = list.slice(1).map((p) => p.folder);
    if (extra.length) days[d].extra = extra;
    list.forEach((p) => assigned.add(p.folder));
  }

  // 今日より前：記録として残す（投稿されなかった予定は missed）
  for (const [d, pe] of Object.entries(prevDays)) {
    if (d >= today || days[d]) continue;
    const { posted, extra, ...rest } = pe;
    days[d] = { ...rest, missed: true };
  }

  // 予定が入っている今日は変えない
  const pe = prevDays[today];
  if (!days[today] && pe && !pe.missed) {
    const p = byFolder.get(pe.folder);
    if (p && !p.posted && isYmd(p.created) && expires(p) >= today) { days[today] = entry(p, pe.reason); assigned.add(p.folder); }
  }

  // ストック（作った日の古い順）を、空いている日に入れる
  const stock = [];
  for (const p of posts) {
    if (p.posted || assigned.has(p.folder)) continue;
    if (!isYmd(p.created)) { warnings.push(`${p.folder}：作った日がわかりません。post.json に "created" を書いてください（${label}ニュース）`); continue; }
    stock.push(p);
  }
  stock.sort((a, b) => a.created.localeCompare(b.created) || a.folder.localeCompare(b.folder));
  const closed = jstDate(now) > today || (jstDate(now) === today && jstMinutes(now) >= time);
  let d = closed ? addDays(today, 1) : today;
  while (stock.length) {
    if (days[d]) { d = addDays(d, 1); continue; }
    while (stock.length && expires(stock[0]) < d) {
      const x = stock.shift();
      // 期限が7日より前に切れたものは、毎回知らせない
      if (expires(x) >= addDays(today, -7)) {
        warnings.push(expires(x) < today
          ? `${x.folder}：賞味期限（${expires(x)}）を過ぎたため投稿しません（${label}ニュース）`
          : `${x.folder}：賞味期限（${expires(x)}）までに順番が来ないため投稿しません（${label}ニュース）`);
      }
    }
    if (!stock.length) break;
    if (stock[0].created > d) { d = stock[0].created; continue; }
    days[d] = entry(stock.shift(), 'ストック');
    d = addDays(d, 1);
  }
  return sortKeys(days);
}

// 予定表の、その日のその枠の項目（なければ null）
function slotDays(schedule, slot = 'morning') {
  const key = SLOT_KEY[slot];
  if (!key) throw new Error(`枠の指定が正しくありません: ${slot}（${Object.keys(SLOT_KEY).join('・')}）`);
  return schedule[key] || {};
}

// ---- アプリ用データ ----

function git(args) {
  try { return execFileSync('git', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (_) { return ''; }
}

function repoName() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const m = git(['remote', 'get-url', 'origin']).match(/github\.com[/:]([^/]+\/[^/]+?)(\.git)?$/);
  return m ? m[1] : 'kai061228-stack/120lab-content';
}

// 画像を最後にコミットしたときの SHA（まだコミットしていない変更があるときは main）
function imagesRef(folder) {
  const rel = `posts/${folder}/images`;
  if (git(['status', '--porcelain', '--', rel])) return 'main';
  return git(['log', '-1', '--format=%H', '--', rel]) || 'main';
}

// 「参考：消費者庁「…」（2020年）、東京消防庁「…」」→ ['消費者庁', '東京消防庁']
function parseSources(caption) {
  const line = caption.split(/\r?\n/).find((l) => l.startsWith('参考：')) || '';
  const parts = [];
  let depth = 0, buf = '';
  for (const ch of line.replace(/^参考：/, '')) {
    if (ch === '「') depth++;
    if (ch === '」') depth = Math.max(0, depth - 1);
    if (ch === '、' && depth === 0) { parts.push(buf); buf = ''; } else buf += ch;
  }
  parts.push(buf);
  const names = parts.map((s) => s.split('「')[0].replace(/（\d{4}年）$/, '').trim()).filter(Boolean);
  return { names: [...new Set(names)], text: line };
}

// 画像URL（表示順）
function imageUrls(folder) {
  const imgDir = path.join(POSTS, folder, 'images');
  const jpgs = fs.existsSync(imgDir) ? fs.readdirSync(imgDir).filter((f) => f.endsWith('.jpg')).sort() : [];
  const ref = imagesRef(folder);
  const base = `https://raw.githubusercontent.com/${repoName()}/${ref}/posts/${encodeURIComponent(folder)}/images/`;
  return jpgs.map((f) => base + f);
}

// キャプションの「参考：」の行（caption.txt がなければ post.json の caption）
function sourcesOf(folder, post) {
  const capFile = path.join(POSTS, folder, 'caption.txt');
  return parseSources(fs.existsSync(capFile) ? fs.readFileSync(capFile, 'utf8') : post.caption || '');
}

function feedPost(folder) {
  const post = JSON.parse(fs.readFileSync(path.join(POSTS, folder, 'post.json'), 'utf8'));
  const src = sourcesOf(folder, post);
  const cat = CAT[post.category] || 'awareness';
  return {
    folder,
    category: LABEL[cat],
    categoryKey: cat,
    title: post.cover.title,
    subtitle: post.cover.subtitle || '',
    images: imageUrls(folder),
    summary: { title: post.summary.title, items: post.summary.items, note: post.summary.note || '' },
    sources: src.names,
    sourcesText: src.text,
  };
}

// アプリ用ニュース：post.json に "app": true がある、ストック式のニュース（AI 以外）
//   表示開始日は作った日の翌日（アプリで0時に切り替わるように）、表示終了日はその APP_NEWS_DAYS 日後
//   表示終了日を過ぎたものは入れない（毎日作り直すので、自動で消える）。Instagram に投稿したかどうかは関係ない
function buildNewsFeed(today = jstDate(), posts = loadPosts(), warnings = []) {
  const items = [];
  for (const p of posts) {
    const { app, newsCategory } = p.post;
    if (!app || !NEWS_SLOT[newsCategory]) continue;
    if (newsCategory === 'AI') { warnings.push(`${p.folder}：AI のニュースはアプリに載せません（"app" は使われません）`); continue; }
    if (!isYmd(p.created)) { warnings.push(`${p.folder}：作った日がわからないため、アプリに載せられません`); continue; }
    const startDate = addDays(p.created, 1);
    const endDate = addDays(startDate, APP_NEWS_DAYS);
    if (endDate < today) continue;
    const src = sourcesOf(p.folder, p.post);
    items.push({
      folder: p.folder,
      title: p.post.cover.title,
      category: newsCategory,
      images: imageUrls(p.folder),
      sources: src.names,
      sourcesText: src.text,
      startDate,
      endDate,
    });
  }
  items.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.folder.localeCompare(b.folder));
  return { version: 1, timezone: 'Asia/Tokyo', from: today, items };
}

// アプリの「今日の学び」は朝5時の枠（schedule.days）だけ。20時の枠（schedule.evening）は載せない
function buildFeed(schedule, today = jstDate()) {
  const days = [];
  for (let i = 0; i < FEED_DAYS; i++) {
    const date = addDays(today, i);
    const e = schedule.days[date];
    const ok = e && !e.missed && fs.existsSync(path.join(POSTS, e.folder, 'post.json'));
    days.push({ date, post: ok ? feedPost(e.folder) : null });
  }
  return { version: 1, timezone: 'Asia/Tokyo', from: today, days };
}

const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
};

// 予定表とアプリ用データを作り直してファイルに書く
function updateFiles({ today = jstDate() } = {}) {
  const r = buildSchedule({ today });
  writeJson(SCHEDULE_FILE, r.schedule);
  writeJson(FEED_FILE, buildFeed(r.schedule, today));
  writeJson(NEWS_FEED_FILE, buildNewsFeed(today, loadPosts(), r.warnings));
  return r;
}

// 予定表の変更点をログに出す
function report({ warnings, moves }) {
  moves.forEach((m) => console.log(`  ・${m.folder}：${m.from} → ${m.to || '予定から外れました'}`));
  warnings.forEach((w) => console.log(`  ⚠ ${w}`));
}

module.exports = {
  SCHEDULE_FILE, FEED_FILE, NEWS_FEED_FILE, SLOT_KEY,
  readSchedule, buildSchedule, slotDays, buildFeed, buildNewsFeed, updateFiles, report, parseSources,
};
