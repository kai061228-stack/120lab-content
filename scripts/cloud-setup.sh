#!/bin/bash
# クラウドの Claude Code（スマホの Claude アプリの Code など）を開いたときに、render の準備をする
# .claude/settings.json の SessionStart フックから呼ばれる。PC（CLAUDE_CODE_REMOTE がない）では何もしない
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0

echo "クラウド用の準備をします（npm・Playwright・日本語フォント）"
if [ ! -d node_modules/playwright ]; then
  npm ci --no-audit --no-fund || echo "⚠ npm ci に失敗しました（ネットワーク設定を確認してください）"
fi
# Chromium（すでにあれば何もしない）。依存ライブラリは入れられる場合だけ入れる
npx playwright install --with-deps chromium >/dev/null 2>&1 || npx playwright install chromium \
  || echo "⚠ Playwright の Chromium を入れられませんでした。render は GitHub Actions のプレビューに任せてください"
# 日本語フォント（Zen Maru Gothic が読めないときの予備）
if ! fc-list 2>/dev/null | grep -qi "Noto Sans CJK"; then
  SUDO=$([ "$(id -u)" = 0 ] || echo sudo)
  ($SUDO apt-get install -y -qq --no-install-recommends fonts-noto-cjk >/dev/null 2>&1 \
    || ($SUDO apt-get update -qq >/dev/null 2>&1 && $SUDO apt-get install -y -qq --no-install-recommends fonts-noto-cjk >/dev/null 2>&1)) \
    || echo "⚠ 日本語フォントを入れられませんでした"
fi
command -v gh >/dev/null 2>&1 && echo "gh：あり" || echo "gh：なし（健康ニュースはプルリクエストの流れで作ります）"
echo "準備が終わりました"
exit 0
