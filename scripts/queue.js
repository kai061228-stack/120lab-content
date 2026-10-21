// 使い方: npm run queue
// 予定表（schedule.json）とアプリ用データを作り直し、これから2週間の投稿予定（朝5時・20時）・カテゴリーごとのストック数・
// 気になるニュースの予定・アプリ用ニュースを表示します
const fs = require('fs');
const { loadPosts, jstDate, addDays, ORDER, LABEL, NEWS, SLOTS } = require('./queue-lib');
const { updateFiles, report, SLOT_KEY, NEWS_FEED_FILE } = require('./schedule-lib');

const today = jstDate();
const r = updateFiles({ today });
const posts = loadPosts();
console.log('■ ストック（未投稿）');
for (const c of ORDER) {
  const n = posts.filter((p) => !p.posted && p.slot === 'morning' && p.category === c).length;
  console.log(`  ${LABEL[c]}：${n}件${n < 3 ? '　← 足りません（3件以上が目安）' : ''}`);
}
if (r.moves.length || r.warnings.length) {
  console.log('\n■ 予定の変更・注意');
  report(r);
}
console.log('\n■ 投稿予定（schedule.json・毎朝5時ごろ）');
const week = ['日', '月', '火', '水', '木', '金', '土'];
for (let i = 0; i < 14; i++) {
  const day = addDays(today, i);
  const e = r.schedule.days[day];
  const w = week[new Date(day + 'T00:00:00Z').getUTCDay()];
  if (!e) { console.log(`  ${day}(${w})  ―― 予定なし（ストック切れ）`); continue; }
  const tags = [['ローテーション', '投稿済み'].includes(e.reason) ? '' : e.reason, e.posted ? '投稿済み' : '', e.extra ? `ほかに ${e.extra.join('・')}` : '']
    .filter(Boolean).join('・');
  console.log(`  ${day}(${w})  ${e.category}  ${e.folder}${tags ? `（${tags}）` : ''}`);
}

// 20時の枠（栄養枠などのイレギュラー発信）：publishDate を書いた日にだけ出る。予定がない日は何も出ない
const evening = r.schedule.evening || {};
const eveDays = Object.keys(evening).filter((d) => d >= today && !evening[d].missed);
const waiting = posts.filter((p) => !p.posted && p.slot === 'evening').length;
console.log(`
■ 20時の枠（schedule.json の evening・未投稿 ${waiting}件）`);
if (!eveDays.length) console.log('  予定なし');
for (const day of eveDays) {
  const e = evening[day];
  const w = week[new Date(day + 'T00:00:00Z').getUTCDay()];
  console.log(`  ${day}(${w})  ${e.category}  ${e.folder}${e.posted ? '（投稿済み）' : ''}`);
}

// 気になるニュース（ストック式）：分野ごとに毎日1件、作った日の古いものから。期限（作った日から10日）を過ぎたものは出ない
for (const [slot, { label }] of Object.entries(NEWS)) {
  const sched = r.schedule[SLOT_KEY[slot]] || {};
  const stock = posts.filter((p) => !p.posted && p.slot === slot).length;
  const list = Object.keys(sched).filter((d) => d >= today && !sched[d].missed);
  console.log(`\n■ ${SLOTS[slot]}（schedule.json の ${SLOT_KEY[slot]}・未投稿 ${stock}件）`);
  if (!list.length) console.log('  予定なし（お休み）');
  for (const day of list) {
    const e = sched[day];
    const w = week[new Date(day + 'T00:00:00Z').getUTCDay()];
    console.log(`  ${day}(${w})  ${e.folder}（${e.posted ? '投稿済み' : `期限 ${e.expires}`}）`);
  }
}

// アプリ用ニュース（app-feed/news.json）
const appNews = JSON.parse(fs.readFileSync(NEWS_FEED_FILE, 'utf8')).items;
console.log(`\n■ アプリ用ニュース（app-feed/news.json・${appNews.length}件）`);
if (!appNews.length) console.log('  なし');
appNews.forEach((n) => console.log(`  ${n.startDate}〜${n.endDate}  ${n.category}  ${n.folder}`));
