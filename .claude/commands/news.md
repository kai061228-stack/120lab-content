---
description: 「気になる健康ニュース」（20時の枠）を、出典のURLから作って投稿するまで
argument-hint: 出典のURL（ラジオで気になった話題など）
---

「気になる健康ニュース」の投稿を作ります。出典：$ARGUMENTS

CLAUDE.md の「気になる健康ニュース」「情報の根拠」「健康情報のルール」「文体」を必ず守ってください。見本は posts/2026-10-16-news-tairyoku です。
返事・報告はすべて日本語で書きます。下の **【止まる】** では、必ず運営者の返事を待ってから次へ進みます。

## 0. PC かクラウドかを確かめる

- `gh --version` が動けば **PC の流れ**（A）、動かなければ **クラウドの流れ**（B。スマホの Claude アプリの Code など）で進める
- 1〜3 はどちらも同じ

## 1. 最新にする

- `git pull` を実行する（クラウドで main 以外のブランチにいるときは `git fetch origin main` して、origin/main をもとに作業する）

## 2. 出典と一次資料を読む

- $ARGUMENTS を開いて読む（URL がなければ、何の話題か運営者に聞く）
- そのもとになっている国・自治体・大学・学会などの一次資料（報道発表・PDF）を探して開き、読む
- 使う数字は、一次資料で確かめられたものだけにする。確かめられない数字は使わない
- 一次資料が見つからない・内容があいまいなときは、作る前に運営者に確認する
- 読んだ資料のURLは、すべて post.json の "sources" に入れる

## 3. post.json を作って render する

- フォルダ：`posts/今日の日付-news-英数字/`（今日＝作った日）
- "category": "健康ニュース"。"publishDate" は必ず書く（発表からなるべく早く、20時の枠が空いている日。`npm run queue` の「20時の枠」で空きを確かめる）
  - クラウドの流れでは、マージした日に投稿される。publishDate はマージする予定の日（夜22時以降なら翌日）にする
- cover（title 1行6文字×3行・subtitle に発表元・date に発表日）と slides（facts / bars / compare / bignum、最後は actions）で作る
- ルールの確認（特に）
  - 「関係があった」と「効果があった」を分けて書く
  - 長い期間の傾向と最近の傾向を混ぜない。どちらの期間の話かをはっきり書き、スライド・キャプション・Threads で食い違わないようにする
  - 効果を保証する言い方・病名を挙げて効果をうたう言い方をしない
  - actions の note に「痛みやふらつきがある方は、かかりつけ医にご相談ください。」などの一文を入れる
- caption（post.json）：最初の1行で読者の思い込みや悩みに触れる →【気になる健康ニュース】と発表の中身 → 最後に「参考：機関名「資料名」（年）」。hashtags は「120歳まで歩く」「理学療法士」を入れて10〜15個
- `npm run render -- posts/フォルダ名` を実行する（caption.txt もできる）
- できた images/ の画像を自分で全部開いて、はみ出し・不自然な改行・縮みすぎがないか確かめ、あれば直して render し直す
  - クラウドで render できない（Playwright・フォントの準備ができていない）ときは、そのことを伝えて、画像の確認は B-2 のプレビューで行う

---

## A. PC の流れ（gh が使える）

### A-4. 見せて確認を待つ 【止まる】

- 次を運営者に見せる
  - 画像（各スライドのPNGの場所と、気になった点）
  - キャプションの全文
  - Threads 3投稿の文（threads.json がなければ `scripts/threads-lib.js` の buildThreadTexts で作られる文を出して見せる）
  - 使った一次資料と、数字ごとの出典
  - 予定日（publishDate）
- 直す点を言われたら直して、render して、もう一度見せる
- 運営者が「確認OK」と言うまで、commit・push はしない

### A-5. 「確認OK」のあと：push と dry_run

- `npm run queue` を実行して、予定（20時の枠）を確かめる
- `git add -A` → `git commit` → `git push`（ref/ など投稿に関係ないものは入れない）
- `gh workflow run instagram.yml -f slot=evening -f folder=フォルダ名 -f dry_run=true` で確認する
- 実行が終わるのを待ち（`gh run watch`）、ログで Instagram・Threads・YouTube の文と動画の長さに問題がないか確かめる
- 成果物 youtube-shorts をダウンロードして（`gh run download 実行ID -n youtube-shorts -D スクラッチパッドのフォルダ`）、mp4 を開いて運営者に見てもらう
  - 成果物に mp4 がないときは、`npm run reel -- posts/フォルダ名` で作った reel.mp4 を開く
- 結果を報告して、**【止まる】** 運営者が「本番OK」と言うまで投稿しない

### A-6. 「本番OK」のあと：投稿してリンクを報告する

- `gh workflow run instagram.yml -f slot=evening -f folder=フォルダ名` で投稿する（dry_run なし）
- 実行が終わるのを待ち、`git pull` して posted.json・threads-posted.json を確かめる
- 各投稿のリンクを報告する：Instagram（カルーセル・リール）、Threads（1〜3投稿目）、YouTube ショート
  - 失敗したものがあれば、ログの内容をそのまま伝える（YouTube の失敗は posted.json の youtubeError も見る）
- Threads が途中で止まったときは、**【止まる】** 続きを出す前に運営者に確認する（OK が出たら `gh workflow run threads-thread.yml -f folder=フォルダ名 -f dry_run=false` で続きから出す）

---

## B. クラウドの流れ（gh が使えない。プルリクエストで確認する）

確認は GitHub のプルリクエストで行い、**マージ＝本番OK** になります。Claude はマージしません。

### B-4. ブランチに commit して push する

- ブランチ：いま `claude/` で始まるブランチにいるときはそのまま使う。それ以外は `news/フォルダ名` を作る（`git checkout -b news/フォルダ名 origin/main`）
- `git add posts/フォルダ名` → `git commit` → `git push -u origin HEAD`（ref/ など投稿に関係ないものは入れない。schedule.json・app-feed は入れない）
- push すると、GitHub Actions「健康ニュースのプレビュー」（.github/workflows/news-preview.yml）が自動で次を行う（5分ほど）
  - プルリクエストを作る（gh がなくてもよい）
  - render して画像をブランチにコミットする（そのあとは `git pull` してから直す）
  - 画像URL・トークンの確認（dry_run）
  - リール動画を作って、プレビュー用のリリース（news-preview-フォルダ名）に置く
  - プルリクエストに、画像6枚・リール動画のリンク・キャプション・Threads 3投稿の文・YouTube のタイトルをコメントする
- プルリクエストの番号は、`curl -s "https://api.github.com/repos/kai061228-stack/120lab-content/pulls?head=kai061228-stack:ブランチ名"` で調べられる（読むだけならログイン不要）

### B-5. 確認をお願いする 【止まる】

- 運営者に次を伝える
  - プルリクエストのリンク（わからなければ https://github.com/kai061228-stack/120lab-content/pulls ）
  - キャプションの全文、Threads 3投稿の文、使った一次資料と数字ごとの出典、予定日
  - 「コメントの画像と動画を確認して、よければマージしてください。マージすると本番で投稿します」
- 直す点を言われたら、同じブランチで直して commit・push する（プレビューのコメントが作り直される）

### B-6. マージのあと（Actions が自動で行う）

- ワークフロー「健康ニュースの本番投稿」（.github/workflows/news-publish.yml）が、instagram.yml を slot=evening・folder=フォルダ名 で起動して投稿する
  - 22時〜翌6時にマージ → 翌朝7時／19時30分〜20時30分にマージ → 20時30分／それ以外 → すぐ
- 終わると、各投稿のリンク（Instagram・Threads・YouTube）がプルリクエストにコメントされる。運営者に聞かれたら、そのコメントを読んで伝える
- Threads が途中で止まったときは、**【止まる】** 続きは自動では出さない。運営者の OK が出たら、GitHub のアプリかブラウザで Actions →「Threads 連投」→ Run workflow（folder=フォルダ名、dry_run を外す）を実行してもらう
