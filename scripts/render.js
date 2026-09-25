// 使い方: npm run render -- posts/2026-09-26-tsumazuki
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const toDataUrl = (file) =>
  'data:' + (MIME[path.extname(file).toLowerCase()] || 'image/png') + ';base64,' + fs.readFileSync(file).toString('base64');

// カテゴリー名（日本語でも英語でも可）→ 英語キー
const CAT = { '運動': 'exercise', '運動系': 'exercise', '知識': 'knowledge', '知識系': 'knowledge', '啓発': 'awareness', '啓発系': 'awareness' };

(async () => {
  const postDir = process.argv[2];
  if (!postDir) {
    console.error('投稿フォルダを指定してください。例: npm run render -- posts/2026-09-26-tsumazuki');
    process.exit(1);
  }
  const post = JSON.parse(fs.readFileSync(path.join(postDir, 'post.json'), 'utf8'));
  const tpl = fs.readFileSync(path.join(ROOT, 'templates', 'carousel.html'), 'utf8');

  // 表紙のキャラクター：カテゴリー専用の画像があればそれを、なければ共通の character.png を使う
  const cat = CAT[post.category] || post.category || 'awareness';
  const candidates = [
    post.cover && typeof post.cover.characterFile === 'string' ? path.join(postDir, post.cover.characterFile) : null,
    path.join(ROOT, 'assets', `character-${cat}.png`),
    path.join(ROOT, 'assets', 'character.png'),
  ].filter(Boolean);
  const charFile = candidates.find((f) => fs.existsSync(f));
  const charData = charFile ? JSON.stringify(toDataUrl(charFile)) : 'null';

  // ポイントごとの画像（投稿フォルダ内、または assets/ 内のファイル名）
  const images = {};
  for (const p of post.points || []) {
    if (!p.image) continue;
    const f = [path.join(postDir, p.image), path.join(ROOT, 'assets', p.image)].find((x) => fs.existsSync(x));
    if (f) images[p.image] = toDataUrl(f);
    else console.warn('画像が見つかりません: ' + p.image + '（画像なしで作ります）');
  }

  const html = tpl
    .replace('/*__POST__*/null', () => JSON.stringify(post))
    .replace('/*__CHAR__*/null', () => charData)
    .replace('/*__IMAGES__*/{}', () => JSON.stringify(images));

  const outDir = path.join(postDir, 'images');
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, f));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const count = await page.evaluate(() => window.slideCount);
  for (let i = 0; i < count; i++) {
    await page.evaluate((n) => window.showSlide(n), i);
    const file = path.join(outDir, String(i + 1).padStart(2, '0') + '.png');
    await page.screenshot({ path: file });
    // Instagramの自動投稿用（APIはJPEGのみ対応）
    await page.screenshot({ path: file.replace(/\.png$/, '.jpg'), type: 'jpeg', quality: 92 });
    console.log('作成: ' + file);
  }
  await browser.close();

  const caption = post.caption + '\n\n' + (post.hashtags || []).map((t) => '#' + t).join(' ');
  fs.writeFileSync(path.join(postDir, 'caption.txt'), caption, 'utf8');
  console.log('作成: ' + path.join(postDir, 'caption.txt'));
})();
