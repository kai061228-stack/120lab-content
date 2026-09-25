// 使い方: npm run queue
// これから2週間の投稿予定と、カテゴリーごとのストック数を表示します
const { plan, loadPosts, ORDER, LABEL } = require('./queue-lib');

const posts = loadPosts();
console.log('■ ストック（未投稿）');
for (const c of ORDER) {
  const n = posts.filter((p) => !p.posted && p.category === c).length;
  console.log(`  ${LABEL[c]}：${n}件${n === 0 ? '　← 足りません' : ''}`);
}
console.log('\n■ 投稿予定（毎朝8時ごろ）');
const week = ['日', '月', '火', '水', '木', '金', '土'];
for (const r of plan(14)) {
  const w = week[new Date(r.day + 'T00:00:00Z').getUTCDay()];
  if (!r.post) { console.log(`  ${r.day}(${w})  ―― ストック切れ（投稿なし）`); continue; }
  const note = r.reason === 'ローテーション' ? '' : `（${r.reason}）`;
  console.log(`  ${r.day}(${w})  ${LABEL[r.post.category]}  ${r.post.folder}${note}`);
}
