// 使い方: npm run preview
// posts フォルダの全投稿の画像とキャプションを、1ページの preview.html にまとめます。
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const postsDir = path.join(root, 'posts');
const outFile = path.join(root, 'preview.html');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const folders = fs.readdirSync(postsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const sections = folders.map((name) => {
  const dir = path.join(postsDir, name);
  const imgDir = path.join(dir, 'images');
  const images = fs.existsSync(imgDir)
    ? fs.readdirSync(imgDir).filter((f) => f.endsWith('.png')).sort()
    : [];
  const captionFile = path.join(dir, 'caption.txt');
  const caption = fs.existsSync(captionFile) ? fs.readFileSync(captionFile, 'utf8') : '';

  const imgs = images.length
    ? images.map((f) => `<img src="posts/${encodeURI(name)}/images/${f}" alt="${esc(name)} ${f}" loading="lazy">`).join('\n      ')
    : '<p class="empty">画像がありません（npm run render -- posts/' + esc(name) + ' を実行してください）</p>';
  const cap = caption
    ? `<pre class="caption">${esc(caption)}</pre>`
    : '<p class="empty">caption.txt がありません</p>';

  return `  <section>
    <h2>${esc(name)}</h2>
    <div class="slides">
      ${imgs}
    </div>
    ${cap}
  </section>`;
});

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>投稿プレビュー</title>
<style>
  body { margin: 0; padding: 24px; background: #F3F7F4; color: #1C2E26; font-family: "Hiragino Maru Gothic ProN", "Meiryo", sans-serif; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #1F5A42; }
  .updated { font-size: 13px; color: #4A5F55; margin: 0 0 24px; }
  section { background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 32px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  h2 { font-size: 18px; margin: 0 0 12px; }
  .slides { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; }
  .slides img { width: 240px; height: auto; flex: none; border-radius: 6px; border: 1px solid #DDE6E0; }
  .caption { white-space: pre-wrap; font-family: inherit; font-size: 15px; line-height: 1.7; margin: 16px 0 0; padding: 16px; background: #F7FAF8; border-radius: 8px; }
  .empty { color: #A33; font-size: 14px; }
</style>
</head>
<body>
  <h1>投稿プレビュー（${folders.length}件）</h1>
  <p class="updated">更新: ${new Date().toLocaleString('ja-JP')}</p>
${sections.join('\n')}
</body>
</html>
`;

fs.writeFileSync(outFile, html, 'utf8');
console.log('作成: ' + outFile);
