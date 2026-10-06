# 120歳まで歩くラボ コンテンツ制作

このフォルダは、Instagram投稿（カルーセル画像＋キャプション）を作るための作業場所です。
運営者は理学療法士（経験10年）で、画像に表示するアカウント名は「@120歳まで歩くラボ」です（templates/carousel.html の BRAND で設定）。
読者は、介護をしている方・介護を受けている方・介護職の方です。

## 投稿を頼まれたときの手順

「〇〇について投稿を作って」と頼まれたら、次の順で進めてください。

1. `posts/YYYY-MM-DD-英数字の短い名前/post.json` を作る（日付は作った日。投稿の順番は自動で決まるので、投稿日ではない）
2. 形式は `posts/2026-09-26-tsumazuki/post.json` と同じにする
3. `npm run render -- posts/フォルダ名` を実行する（全投稿をまとめて作り直すときは `npm run all`）
4. できた `images/` のPNGを自分で開いて確認し、文字のはみ出しや不自然な改行があれば post.json を直して再実行する
5. 最後に、作ったフォルダの場所と、キャプションの全文を報告する

## 報告のルール

- 作業の報告や質問は、すべて日本語で行う

## カテゴリー（色とキャラクター）

- post.json の先頭に "category" を書く。「運動」「知識」「啓発」のどれか
  - 運動：オレンジ。体操・ストレッチなど体を動かす内容
  - 知識：青。体のしくみ・病気の予防の知識など
  - 啓発：緑。暮らし方・心がけ・環境づくりなど
- 表紙のキャラクターはカテゴリーに合わせて自動で入る（assets/character-exercise.png、character-knowledge.png、character-awareness.png）
- キャラクターを入れたくない投稿は cover に "character": false を書く
- 表紙のラベル（体操・からだの知識・暮らしのヒント）を変えたいときは cover に "tag": "文字" を書く。消すときは "tag": false

## ポイントに画像を入れる

- ポイントに "image": "ファイル名.jpg" を書くと、本文の下に画像が入る
- 画像ファイルは投稿フォルダ（posts/フォルダ名/）に置く
- 画像を切り取らず全体を見せたいときは "imageFit": "contain" を書く
- 画像ありのスライドは文字が少し小さくなる

## 文字量の目安（はみ出し防止）

- 表紙タイトル：1行7文字以内×2行（改行は \n）
- 表紙サブタイトル：20文字以内
- ポイント見出し：1行8文字以内×2行
- 表紙タイトルと見出しは、2行目を助詞（の・に・が・を など）で始めない
- ポイント本文：50文字以内（\n は文字数に数えない）
  - 画像の1行は約14文字（画像ありのスライドは約17文字）
  - 文の区切りで \n を入れ、\n で区切った1行も14文字以内にする（「しょ／う。」のような折り返しを防ぐ）
  - 目安は4行まで
- ポイント数：3〜5個（まとめスライドは項目数に合わせて文字サイズが自動で小さくなります）
- まとめの項目：1項目10文字以内、ポイント数と同じ数
- cta（最後のボタンの文）は16文字以内
- キャプション：300〜500文字。最初の1行で読者の悩みに触れる
- ハッシュタグ：10〜15個。「120歳まで歩く」「理学療法士」は必ず入れる

## 健康情報のルール（必ず守る）

- 「治る」「改善する」「痛みが消える」など、効果を保証する言い方をしない
- 病名を挙げて効果をうたわない（医療広告・薬機法への配慮）
- 運動を紹介するときは、無理をしない・痛みが出たら中止する旨を入れる
- まとめの note には「痛みやふらつきがある方は、かかりつけ医にご相談ください。」などの一文を入れる
- 根拠のあやしい情報は書かない。迷ったら運営者に確認する

## 情報の根拠（必ず守る）

- 健康・医療の内容は、次のどれかにもとづいて書く。記憶だけで書かない
  - 厚生労働省・国立健康危機管理研究機構（JIHS）・気象庁・内閣府・政府広報オンライン・自治体などの公的機関
  - 日本呼吸器学会などの学会、診療ガイドライン
  - 日本理学療法士協会などの職能団体の資料
  - NHKなど報道機関の報道（公的機関の発表を伝えているもの）
- 参照したページのURLを post.json の "sources" に配列で書く（画像には出ないが記録として残す）
- キャプションの最後（ハッシュタグの前）に「参考：〇〇（機関名）」を1〜2行で入れる
- 数字（患者数・割合など）は出典に書かれているとおりに使い、出典の年も書く。あいまいなら数字を使わない
- 「免疫力アップ」「〇〇で予防できる」のような効果の断定はしない。「〜が大切とされています」「〜が勧められています」のように書く
- 時事の注意喚起（台風・感染症の流行など）は、post.json に "publishDate" を書いて、情報が古くならないうちに出す
- 迷う内容・新しい情報は、作る前に運営者（理学療法士）に確認する

## 文体

- やさしい言葉で、専門用語は使わないか言い換える
- 1文を短くする
- 読者を責める言い方をしない（「〜していませんか？」はOK、「〜はダメ」は避ける）

## Instagram 自動投稿（GitHub Actions）

- 毎朝5時ごろに1日1件、自動で Instagram に投稿される（本命は外部サービスからの 5:00 の起動。予備として GitHub の定時起動が 5:20。何回起動しても二重投稿はしない）
- 投稿する日は、予定表 `schedule.json`（日付 → フォルダ）で決まる。毎朝の投稿は「今日（日本時間）の予定」を出す。予定がない日は投稿しない
- 予定表の決め方（scripts/schedule-lib.js）
  - カテゴリーは「運動 → 知識 → 啓発 → 運動 …」の順に1日ずつ回る
  - 同じカテゴリーの中では、フォルダ名の順（古いもの）から出る
  - その日のカテゴリーのストックがないときは、次のカテゴリーから繰り上げて出す
  - どうしてもこの日に出したい投稿は、post.json に "publishDate": "YYYY-MM-DD" を書く（その日に優先して出る。その日に自動で入っていた投稿は、空いている一番早い日に移る）
  - 一度決まった日付は、新しい投稿を足しても動かない（空いている日だけ埋める）。今日より前と、予定が入っている今日は変わらない
  - 投稿済みの投稿は、実際に投稿した日に固定される（予定日より前にフォルダ指定で手動投稿すると、その日に移り、元の予定日はストックから埋める）
  - 投稿されずに日付が過ぎた予定は missed として記録に残り、その投稿はストックに戻って空いている日に入り直す
- `npm run queue` で予定表と app-feed/feed.json を作り直し、2週間分の投稿予定とカテゴリーごとのストック数を確認できる。投稿を作ったら最後にこれを実行して、予定を報告する
- schedule.json と app-feed/feed.json は、push するとワークフロー「投稿予定表の更新」（.github/workflows/schedule.yml）が自動で作り直してコミットする（毎朝の投稿のあとにも動く）。PC で作り忘れても大丈夫。手で編集しない
- 予定の確認（投稿はしない）：PC では `node scripts/publish.js --which --date YYYY-MM-DD`。Actions では `gh workflow run instagram.yml -f dry_run=true -f date=YYYY-MM-DD`（date は空欄なら今日。dry_run のときだけ使える）
- ストックは各カテゴリー3件以上（合計9件＝9日分以上）を目安にする。足りないカテゴリーがあれば報告する
- 投稿には `images/` の JPEG（01.jpg〜）と `caption.txt` を使う。`npm run render` で PNG と一緒に JPEG も作られる
- 投稿が終わると、そのフォルダに `posted.json` が自動で追加される（二重投稿の防止）。PC側では作業の前に `git pull` する
- 投稿を作ったら、`npm run render` → 画像確認 → `npm run queue` → `git add -A` → `git commit` → `git push` まで行う（push しないと投稿されない）
- 投稿済み（posted.json がある）フォルダは、名前を変えたり消したりしない
- アクセストークンは GitHub の Secrets（IG_ACCESS_TOKEN / IG_USER_ID）にだけ保存する。ファイルやチャットには絶対に書かない
- カルーセルを投稿したあと、同じ画像を動画にしたリール（BGM付き）も自動で投稿する
  - 表示時間は表紙3秒・2枚目以降6秒（scripts/reel.js の FIRST と EACH）
  - BGM は assets/bgm/ の exercise.mp3（運動）・knowledge.mp3（知識）・awareness.mp3（啓発）。すべて甘茶の音楽工房の曲
  - リールのキャプションには、ハッシュタグの前に「BGM：甘茶の音楽工房」が自動で入る（カルーセルには入らない）
  - `npm run reel -- posts/フォルダ名` で、PCでもリール動画（reel.mp4）を作って確認できる（ffmpeg が必要。reel.mp4 は git に入れない）
  - Actions ではリール動画を gh-pages ブランチ（GitHub Pages）に置き、その公開URLを Instagram に渡す。gh-pages は毎回その日の動画1本＋site/ のページに上書きされるので、手で編集しない
- ホームページ（site/index.html）とプライバシーポリシー（site/privacy.html）は YouTube 連携の審査用。直すときは main の site/ を編集して push する（次に gh-pages が作り直されたときに反映。すぐ反映したいときは gh-pages にも同じ内容をコミットする）
  - https://kai061228-stack.github.io/120lab-content/ と https://kai061228-stack.github.io/120lab-content/privacy.html

## YouTube ショート

- 毎朝の投稿の順番：カルーセル → リール → Threads → YouTube ショート（scripts/youtube.js）
  - その日のリール用に作った reel.mp4 を、同じ実行の中でそのままアップロードする（YouTube Data API v3 の videos.insert・再開可能アップロード）
  - タイトル：表紙タイトル（＋サブタイトル）＋「 #Shorts」（100文字以内）。説明：リールのキャプションと同じ（参考・BGM表記・ハッシュタグ入り）
  - カテゴリーは「教育」、子ども向けではない。公開設定は GitHub の変数 YT_PRIVACY（private / unlisted / public。なければ private）
- Instagram に投稿済み（posted.json がある）のときだけ出す。成功すると posted.json に youtubeId が入り、あれば二度と出さない
- YouTube が失敗しても Instagram・Threads は失敗扱いにしない（ログと posted.json の youtubeError に残る）
- フォルダを指定して実行すると、Instagram・Threads が投稿済みなら YouTube だけ出る：`gh workflow run instagram.yml -f folder=フォルダ名`
- 確認だけ：`-f dry_run=true`（タイトル・説明・動画の長さを表示するだけ）
- 各実行の成果物（Artifacts の youtube-shorts）から、その日の mp4・title.txt・description.txt をダウンロードできる（手動投稿用。14日で消える）
- 認証：PC で `npm run youtube-auth`（gh にログインしておく）→ ブラウザで許可すると、Secrets（YT_CLIENT_ID・YT_CLIENT_SECRET・YT_REFRESH_TOKEN）に直接登録される（値は画面に出さない）。クライアント情報のファイルはリポジトリに入れない

## 健康アプリ（kenko_app）用のデータ

- `app-feed/feed.json` に、今日から7日先までの「今日の健康情報」（Instagram と同じ日に同じ投稿）を入れている
  - 各日：date、post（予定がない日は null）。post にはカテゴリー、表紙タイトル・サブタイトル、画像URL（表示順）、まとめ、参考の機関名（sources）と参考の行（sourcesText）
  - 画像URLは main の画像を最後にコミットした SHA で固定した raw.githubusercontent.com のURL（gh-pages は使わない）
- アプリが読むURL：https://raw.githubusercontent.com/kai061228-stack/120lab-content/main/app-feed/feed.json（`?t=時刻` を付けて読む）
- アプリは端末の日付（日本時間）と同じ date の項目を表示する。0時に切り替わっても、7日分入っているので更新を待たなくてよい

## Threads 連投

- 毎朝の Instagram 投稿のあと、同じワークフローの中で Threads にも自動で連投する（scripts/threads-auto.js）
  - 予定表の今日のフォルダが Instagram に投稿済みのときだけ出す（threads-posted.json があれば何もしない）
  - Instagram の投稿と記録の保存が終わってから動く。Threads が失敗しても Instagram の投稿やワークフローは止まらない
  - 1投稿目の動画は、同じ実行で Instagram のリールに使った公開URLを使い回す（gh-pages を push し直さない）。その実行でリール動画の公開（Pages の反映）が間に合わなかったときは、Threads はすぐやめて次の実行（予備の定時起動など）に任せる
  - threads.json がなければ、post.json から自動で作る（scripts/threads-lib.js）。キャプション冒頭の問いかけ・ポイントの見出しと本文・参考・まとめ・注意書きを組み立てるだけで、新しい内容は足さない
  - 自動の文章を直したいときは、投稿日の前に threads.json を手で書いて push する（あれば手書きを優先）
- 手動で出すときは、ワークフロー「Threads 連投」（.github/workflows/threads-thread.yml）を使う
- 文章は posts/フォルダ名/threads.json に3つの配列で書く
  - 1投稿目：リール動画＋冒頭の問いかけ＋結論。最後の行は「BGM：甘茶の音楽工房」
  - 2投稿目：理由・根拠（1投稿目への返信）。最後に「参考：〇〇」
  - 3投稿目：今日からできること（2投稿目への返信）
  - 各500字以内。トピックタグ（#）は3投稿を通して1つだけ。「詳しくは〇〇で」などの誘導は入れない
- 実行：`gh workflow run threads-thread.yml -f folder=フォルダ名 -f dry_run=true`（確認）→ `-f dry_run=false`（本番）
- 投稿後は threads-posted.json が追加される（二重投稿の防止。途中で失敗したら続きから投稿される）

## トークンの延長（自動）

- ワークフロー「トークンの延長」（.github/workflows/refresh-tokens.yml・scripts/refresh-tokens.js）が、毎月1日と15日の10:30に IG_ACCESS_TOKEN と THREADS_ACCESS_TOKEN を延長し、GitHub Secrets を新しいトークンに書き換える
- Secrets の書き換えには、GitHub のトークン（Secrets: Read and write）を SECRETS_UPDATER_TOKEN という名前で Secrets に登録しておく必要がある
- 手動実行：`gh workflow run refresh-tokens.yml`（初期値は確認だけ）→ 延長するときは `-f dry_run=false`（`-f target=instagram` などで片方だけも可）
- トークンは作成（または前回の延長）から24時間たたないと延長できない。期限（約60日）が切れると延長できないので、失敗の通知が来たら早めに確認する
