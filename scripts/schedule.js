// 使い方: node scripts/schedule.js
// 予定表（schedule.json）とアプリ用データ（app-feed/feed.json）を作り直す
// push すると GitHub Actions（投稿予定表の更新）でも自動で実行される
const { updateFiles, report } = require('./schedule-lib');

const r = updateFiles();
console.log('予定表（schedule.json）とアプリ用データ（app-feed/feed.json）を更新しました');
report(r);
