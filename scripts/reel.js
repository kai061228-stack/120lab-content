// リール動画を作る（カルーセル画像 ＋ カテゴリー別BGM）
// 使い方: node scripts/reel.js posts/フォルダ名   → posts/フォルダ名/reel.mp4 ができる
// ffmpeg が必要（GitHub Actions では自動で入れる。PCで試す場合は winget install ffmpeg）
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { catKey, ORDER } = require('./queue-lib');
// 縦長（9:16）にするときの上下の余白の色（表紙の色。栄養以外のイレギュラー発信も栄養と同じ黄色）
const PAD = { exercise: '0xC9531A', knowledge: '0x1F4E8C', awareness: '0x1E5A40', nutrition: '0xF2B705', special: '0xF2B705' };
const FIRST = 3;      // 表紙の表示秒数
const EACH = 6;       // 2枚目以降の表示秒数（読む時間）
const FADE = 0.5;     // 切り替えのフェード秒数
const VOLUME = 0.3;   // BGMの音量（元の曲を1としたときの倍率）

// Actions では apt-get が遅いことがあるため、GitHub Releases の静的ビルドを使う（失敗したら apt-get）
// 入れた場所は GITHUB_PATH にも書くので、同じジョブのあとのステップでも使える
const FFMPEG_URL = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz';
const hasFfmpeg = () => { try { execSync('ffmpeg -version', { stdio: 'ignore' }); return true; } catch (_) { return false; } };

function ensureFfmpeg() {
  if (hasFfmpeg()) return;
  if (!process.env.GITHUB_ACTIONS) {
    throw new Error('ffmpeg が見つかりません。PCで試す場合は PowerShell で winget install ffmpeg を実行してください');
  }
  const dir = path.join(process.env.RUNNER_TEMP || require('os').tmpdir(), 'ffmpeg');
  const bin = path.join(dir, 'bin');
  try {
    console.log('ffmpeg をダウンロードします…');
    fs.mkdirSync(dir, { recursive: true });
    execSync(`curl -fsSL --retry 3 --connect-timeout 20 --max-time 300 -o "${dir}.tar.xz" "${FFMPEG_URL}" && tar -xJf "${dir}.tar.xz" -C "${dir}" --strip-components=1`, { stdio: 'inherit' });
    process.env.PATH = `${bin}${path.delimiter}${process.env.PATH}`;
    if (process.env.GITHUB_PATH) fs.appendFileSync(process.env.GITHUB_PATH, bin + '\n');
  } catch (e) {
    console.log('  ダウンロードできませんでした（' + e.message.split('\n')[0] + '）。apt-get で入れます…');
  }
  if (hasFfmpeg()) { console.log('  ffmpeg を用意しました'); return; }
  execSync('sudo apt-get update -qq && sudo apt-get install -y -qq --no-install-recommends ffmpeg', { stdio: 'inherit' });
}

// BGM は assets/bgm/カテゴリーの英語キー.mp3（運動 exercise・知識 knowledge・啓発 awareness・栄養 nutrition）
// 18時の枠（栄養など）で専用の曲がまだないときは、運動と同じ exercise.mp3 を使う
// （専用の曲に替えるときは、assets/bgm/nutrition.mp3 のように置くだけでよい）
function bgmFile(cat) {
  const dir = path.join(ROOT, 'assets', 'bgm');
  const names = [`${cat}.mp3`];
  if (!ORDER.includes(cat)) names.push('exercise.mp3');
  const f = names.map((n) => path.join(dir, n)).find((x) => fs.existsSync(x));
  return f || null;
}

function makeReel(postDir) {
  ensureFfmpeg();
  const post = JSON.parse(fs.readFileSync(path.join(postDir, 'post.json'), 'utf8'));
  const cat = catKey(post.category);
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

module.exports = { makeReel, ensureFfmpeg };
if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { console.error('例: node scripts/reel.js posts/2026-09-26-kansen-shukan'); process.exit(1); }
  try { makeReel(dir); } catch (e) { console.error(e.message); process.exit(1); }
}
