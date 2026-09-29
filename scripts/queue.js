// 使い方: npm run queue
// 予定表（schedule.json）とアプリ用データを作り直し、これから2週間の投稿予定とカテゴリーごとのストック数を表示します
const { loadPosts, jstDate, addDays, ORDER, LABEL } = require('./queue-lib');
const { updateFiles, report } = require('./schedule-lib');

const today = jstDate();
const r = updateFiles({ today });
const posts = loadPosts();
console.log('■ ストック（未投稿）');
for (const c of ORDER) {
  const n = posts.filter((p) => !p.posted && p.category === c).length;
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
