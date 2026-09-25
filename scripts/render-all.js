// 使い方: npm run all
// posts フォルダの全投稿の画像を作り直し、最後に preview.html を更新します。
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const postsDir = path.join(root, 'posts');
const folders = fs.readdirSync(postsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(postsDir, d.name, 'post.json')))
  .map((d) => d.name)
  .sort();

for (const name of folders) {
  console.log('--- ' + name);
  execFileSync(process.execPath, [path.join(__dirname, 'render.js'), path.join('posts', name)], { cwd: root, stdio: 'inherit' });
}
execFileSync(process.execPath, [path.join(__dirname, 'preview.js')], { cwd: root, stdio: 'inherit' });
console.log('完了：' + folders.length + '件の投稿を作り直し、preview.html を更新しました');
