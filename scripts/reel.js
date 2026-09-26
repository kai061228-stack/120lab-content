// リール動画を作る（カルーセル画像 ＋ カテゴリー別BGM）
// 使い方: node scripts/reel.js posts/フォルダ名   → posts/フォルダ名/reel.mp4 ができる
// ffmpeg が必要（GitHub Actions では自動で入れる。PCで試す場合は winget install ffmpeg）
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CAT = { '運動': 'exercise', '運動系': 'exercise', '知識': 'knowledge', '知識系': 'knowledge', '啓発': 'awareness', '啓発系': 'awareness' };
const PAD = { exercise: '0xC9531A', knowledge: '0x1F4E8C', awareness: '0x1E5A40' };
const FIRST = 3;      // 表紙の表示秒数
const EACH = 6;       // 2枚目以降の表示秒数（読む時間）
const FADE = 0.5;     // 切り替えのフェード秒数
const VOLUME = 0.6;   // BGMの音量

function ensureFfmpeg() {
  try { execSync('ffmpeg -version', { stdio: 'ignore' }); return; } catch (_) {}
  if (process.env.GITHUB_ACTIONS) {
    console.log('ffmpeg をインストールします…');
    execSync('sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg', { stdio: 'inherit' });
    return;
  }
  throw new Error('ffmpeg が見つかりません。PCで試す場合は PowerShell で winget install ffmpeg を実行してください');
}

function bgmFile(cat) {
  const dir = path.join(ROOT, 'assets', 'bgm');
  for (const name of [`${cat}.mp3`, `${cat}.mp3.mp3`]) {
    const f = path.join(dir, name);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

function makeReel(postDir) {
  ensureFfmpeg();
  const post = JSON.parse(fs.readFileSync(path.join(postDir, 'post.json'), 'utf8'));
  const cat = CAT[post.category] || post.category || 'awareness';
  const imgDir = path.join(postDir, 'images');
  const imgs = fs.readdirSync(imgDir).filter((f) => f.endsWith('.jpg')).sort().map((f) => path.join(imgDir, f));
  if (!imgs.length) throw new Error('JPEG画像がありません: ' + imgDir);
  const bgm = bgmFile(cat);
  if (!bgm) throw new Error(`BGMがありません: assets/bgm/${cat}.mp3`);

  const durs = imgs.map((_, i) => (i === 0 ? FIRST : EACH) + (i < imgs.length - 1 ? FADE : 0));
  const total = durs.reduce((a, b) => a + b, 0) - FADE * (imgs.length - 1);

  const args = ['-y'];
  imgs.forEach((f, i) => args.push('-loop', '1', '-t', String(durs[i]), '-i', f));
  args.push('-stream_loop', '-1', '-i', bgm);

  const filters = [];
  imgs.forEach((_, i) => {
    filters.push(`[${i}:v]scale=1080:1350,pad=1080:1920:0:285:color=${PAD[cat]},setsar=1,fps=30,format=yuv420p[v${i}]`);
  });
  let last = 'v0';
  let offset = 0;
  for (let i = 1; i < imgs.length; i++) {
    offset += durs[i - 1] - FADE;
    const out = i === imgs.length - 1 ? 'vout' : `x${i}`;
    filters.push(`[${last}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(2)}[${out}]`);
    last = out;
  }
  if (imgs.length === 1) filters.push('[v0]copy[vout]');
  const a = imgs.length;
  filters.push(`[${a}:a]atrim=0:${total.toFixed(2)},afade=t=in:d=0.5,afade=t=out:st=${(total - 2).toFixed(2)}:d=2,volume=${VOLUME}[aout]`);

  const out = path.join(postDir, 'reel.mp4');
  args.push('-filter_complex', filters.join(';'), '-map', '[vout]', '-map', '[aout]',
    '-t', total.toFixed(2), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-movflags', '+faststart', out);
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  console.log(`作成: ${out}（${total.toFixed(1)}秒・BGM ${path.basename(bgm)}）`);
  return out;
}

module.exports = { makeReel };
if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { console.error('例: node scripts/reel.js posts/2026-09-26-kansen-shukan'); process.exit(1); }
  try { makeReel(dir); } catch (e) { console.error(e.message); process.exit(1); }
}
