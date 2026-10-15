// Instagram / Threads の長期アクセストークンを延長し、GitHub Secrets を新しいトークンに書き換える
// （.github/workflows/refresh-tokens.yml から実行。毎朝の投稿の仕組みとは別）
// 使い方:
//   TARGET=both|instagram|threads node scripts/refresh-tokens.js
//   DRY_RUN=1 を付けると、延長はせずに今のトークンと SECRETS_UPDATER_TOKEN が使えるかだけ確かめる
// 必要な環境変数:
//   IG_ACCESS_TOKEN / THREADS_ACCESS_TOKEN（今のトークン）
//   GH_TOKEN（Secrets を書き換えられる GitHub のトークン。Secrets の SECRETS_UPDATER_TOKEN）
//   GITHUB_REPOSITORY（Actions では自動で入る）
// 注意:
//   - どちらのトークンも、作成（または前回の延長）から24時間以上たっていないと延長できない
//   - 期限（約60日）が切れたトークンは延長できない。月1回の実行で間に合う
//   - 新しいトークンはログに出さない（::add-mask:: で隠す）
const { execFileSync } = require('child_process');

const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const TARGET = (process.env.TARGET || 'both').toLowerCase();

const SERVICES = {
  instagram: {
    label: 'Instagram',
    secret: 'IG_ACCESS_TOKEN',
    me: (t) => `https://graph.instagram.com/v25.0/me?fields=user_id,username&access_token=${encodeURIComponent(t)}`,
    refresh: (t) => `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(t)}`,
  },
  threads: {
    label: 'Threads',
    secret: 'THREADS_ACCESS_TOKEN',
    me: (t) => `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${encodeURIComponent(t)}`,
    refresh: (t) => `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(t)}`,
  },
};

async function getJson(url) {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const msg = json.error ? `${json.error.message}（code ${json.error.code}）` : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

function jstDate(ms) {
  return new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

// Secrets を書き換える GitHub のトークン（SECRETS_UPDATER_TOKEN）が使えるか確かめる。問題があればその理由を返す
function checkUpdater() {
  if (!process.env.GH_TOKEN) return 'SECRETS_UPDATER_TOKEN（Secrets を書き換える GitHub のトークン）が登録されていません';
  if (!process.env.GITHUB_REPOSITORY) return 'GITHUB_REPOSITORY がありません';
  try {
    execFileSync('gh', ['api', `repos/${process.env.GITHUB_REPOSITORY}/actions/secrets/public-key`], { stdio: ['ignore', 'ignore', 'pipe'] });
    return null;
  } catch (e) {
    return 'SECRETS_UPDATER_TOKEN で Secrets を読めません（権限「Secrets: Read and write」・対象リポジトリ・有効期限を確認してください）';
  }
}

async function run(key, updaterError) {
  const s = SERVICES[key];
  const token = process.env[s.secret];
  if (!token) throw new Error(`${s.secret} がありません`);

  const me = await getJson(s.me(token));
  console.log(`▼ ${s.label}：今のトークンは使えます（@${me.username}）`);
  if (DRY) { console.log('  DRY_RUN のため延長しません'); return; }
  if (updaterError) throw new Error('延長しません（SECRETS_UPDATER_TOKEN が使えないため）');

  const r = await getJson(s.refresh(token));
  if (!r.access_token) throw new Error('延長の結果に新しいトークンがありません');
  console.log(`::add-mask::${r.access_token}`);
  const days = Math.floor((r.expires_in || 0) / 86400);
  const until = r.expires_in ? jstDate(Date.now() + r.expires_in * 1000) : '不明';

  // 新しいトークンで実際に使えるか確かめてから Secrets を書き換える
  await getJson(s.me(r.access_token));
  execFileSync('gh', ['secret', 'set', s.secret, '--repo', process.env.GITHUB_REPOSITORY], {
    input: r.access_token, stdio: ['pipe', 'ignore', 'pipe'],
  });
  console.log(`  延長して ${s.secret} を更新しました（有効期限：あと約${days}日、${until}ごろまで）`);
}

async function main() {
  const keys = TARGET === 'both' ? ['instagram', 'threads'] : [TARGET];
  for (const k of keys) if (!SERVICES[k]) throw new Error('TARGET は both / instagram / threads のどれかにしてください: ' + TARGET);
  // 確認だけのときも確かめる。使えなくても、先に Instagram・Threads のトークンが使えるかはログに出す
  const updaterError = checkUpdater();
  console.log(updaterError ? `✖ ${updaterError}` : '▼ SECRETS_UPDATER_TOKEN：Secrets を読み書きできます');
  let failed = updaterError ? 1 : 0;
  for (const k of keys) {
    try { await run(k, updaterError); } catch (e) {
      failed++;
      console.error(`✖ ${SERVICES[k].label}：${e.message.replace(/access_token=[^&\s]+/g, 'access_token=***')}`);
    }
  }
  if (failed) process.exit(1);
}

main().catch((e) => { console.error('✖ ' + e.message); process.exit(1); });
