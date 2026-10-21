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

- 返事は日本語で書く。作業の報告や質問も含めて、すべて日本語で行う（英語で返事をしない）

## カテゴリー（色とキャラクター）

- post.json の先頭に "category" を書く。ふだんの投稿（朝5時の枠）は「運動」「知識」「啓発」のどれか
  - 運動：オレンジ。体操・ストレッチなど体を動かす内容
  - 知識：青。体のしくみ・病気の予防の知識など
  - 啓発：緑。暮らし方・心がけ・環境づくりなど
- イレギュラー発信（20時の枠）は「栄養」など、運動・知識・啓発以外を書く（下の「20時の枠」を参照）
  - 栄養：黄色。表紙の文字は濃い茶色、ラベルは「栄養」
  - 健康ニュース：鮮やかな黄緑。専用のひな形 templates/news.html を使う（下の「気になる健康ニュース」を参照）
  - ほかの○○week など、色を決めていないカテゴリーも黄色になり、ラベルはカテゴリー名になる（色を分けたいときは templates/carousel.html の THEMES と scripts/queue-lib.js の SPECIAL に足す）
- 表紙のキャラクターはカテゴリーに合わせて自動で入る（assets/character-exercise.png、character-knowledge.png、character-awareness.png）
- 運動・知識・啓発以外のイレギュラー発信（栄養枠、ビタミンweek などの○○week）は、表紙（1枚目）のかいたろ君をすべて assets/character-special.png（赤ペンを持ってガッツポーズ）にする
  - category に運動・知識・啓発以外（例："栄養"）を書くと自動でこの画像になる。カテゴリーごとに新しいキャラクター画像は作らない
  - **例外：健康ニュース**は、運営者が決めた専用の assets/character-news.png（スーツで指し棒を持つかいたろ君）を使う。表紙の右下に置き、指し棒が右（スワイプの方向）を向くようにする。「注目！」シール（assets/sticker-chumoku.png）はかいたろ君の右上
    - 画像はもともと指し棒が右を向いているので、そのまま使う（左右反転すると左を向く）。左向きの画像に差し替えたときは cover に "characterFlip": true を書く
    - この例外は健康ニュースだけ。ほかのイレギュラー発信は今までどおり character-special.png
- テーマで決まっているかいたろ君（朝の枠でも20時の枠でも、カテゴリーの画像より優先する。cover に "characterFile" で指定する）
  - AI に関する投稿：assets/character-ai.png（ロボットのかいたろ君）
  - 医療・介護保険などの制度の変更に関する投稿：assets/character-system.png（天びんと本を持つかいたろ君）
- 決まった画像以外にしたいときは cover に "characterFile": "assets/character-special.png" のように書く（投稿フォルダからの場所でもよい）
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
  - 公的機関に準じるもの：健康長寿ネット（長寿科学振興財団）、テクノエイド協会（福祉用具・歩行補助具など）
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
- 20時の枠（イレギュラー発信）がある日は、20時ごろにもう1件投稿される（下の「20時の枠」を参照）
- 気になるニュースのストックがある日は、20:15（医療・介護）・20:30（健康）・20:45（AI）にも投稿される（下の「気になるニュース」を参照）
- 21時の脳トレ動画は、運営者が YouTube と Instagram に自分で予約投稿している（このリポジトリとは関係ない）。時刻を足すときは21時と重ねない
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
- 予定の確認（投稿はしない）：PC では `node scripts/publish.js --which --date YYYY-MM-DD`（20時の枠は `--slot evening` を付ける）。Actions では `gh workflow run instagram.yml -f dry_run=true -f date=YYYY-MM-DD`（date は空欄なら今日。dry_run のときだけ使える）
- ストックは各カテゴリー3件以上（合計9件＝9日分以上）を目安にする。足りないカテゴリーがあれば報告する（20時の枠の投稿は数えない）
- 投稿には `images/` の JPEG（01.jpg〜）と `caption.txt` を使う。`npm run render` で PNG と一緒に JPEG も作られる
- 投稿が終わると、そのフォルダに `posted.json` が自動で追加される（二重投稿の防止）。PC側では作業の前に `git pull` する
- 投稿を作ったら、`npm run render` → 画像確認 → `npm run queue` → `git add -A` → `git commit` → `git push` まで行う（push しないと投稿されない）
- 投稿済み（posted.json がある）フォルダは、名前を変えたり消したりしない
- アクセストークンは GitHub の Secrets（IG_ACCESS_TOKEN / IG_USER_ID）にだけ保存する。ファイルやチャットには絶対に書かない
- カルーセルを投稿したあと、同じ画像を動画にしたリール（BGM付き）も自動で投稿する
  - 表示時間は表紙3秒・2枚目以降6秒（scripts/reel.js の FIRST と EACH）
  - BGM は assets/bgm/ の exercise.mp3（運動）・knowledge.mp3（知識）・awareness.mp3（啓発）・news.mp3（健康ニュース）。すべて甘茶の音楽工房の曲
  - 栄養（20時の枠）は、専用の曲がないあいだ運動と同じ exercise.mp3 を使う。替えるときは assets/bgm/nutrition.mp3 を置くだけでよい（甘茶の音楽工房以外の曲にするときは、キャプションの「BGM：甘茶の音楽工房」も直す必要がある）
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
- 気になるニュース（ストック式。20時15分・20時30分・20時45分の枠）は YouTube には上げない（1日のアップロードの上限に余裕を持たせるため。Instagram・Threads だけ）

## 健康アプリ（kenko_app）用のデータ

- `app-feed/feed.json` に、今日から7日先までの「今日の健康情報」（Instagram と同じ日に同じ投稿）を入れている
  - 各日：date、post（予定がない日は null）。post にはカテゴリー、表紙タイトル・サブタイトル、画像URL（表示順）、まとめ、参考の機関名（sources）と参考の行（sourcesText）
  - 画像URLは main の画像を最後にコミットした SHA で固定した raw.githubusercontent.com のURL（gh-pages は使わない）
- アプリが読むURL：https://raw.githubusercontent.com/kai061228-stack/120lab-content/main/app-feed/feed.json（`?t=時刻` を付けて読む）
- アプリは端末の日付（日本時間）と同じ date の項目を表示する。0時に切り替わっても、7日分入っているので更新を待たなくてよい
- アプリの「今日の学び」に載せるのは朝5時の枠の投稿だけ。20時の枠（栄養など）・気になるニュースは feed.json に入れない
- アプリ用ニュースは `app-feed/news.json`（アプリが読むURL：https://raw.githubusercontent.com/kai061228-stack/120lab-content/main/app-feed/news.json）
  - 入るのは、post.json に "app": true がある気になるニュース（ストック式）だけ。**AI のニュースは対象外**（"app" を書いても入らない）
  - items の各項目：folder、title（表紙タイトル。改行は \n）、category（医療・介護／健康）、images（画像URL・表示順。SHA で固定）、sources（参考の機関名）、sourcesText（参考の行）、startDate（表示開始日）、endDate（表示終了日）
  - startDate は作った日（"created"）の翌日、endDate は startDate の10日後。アプリは startDate ≦ 今日 ≦ endDate のものを表示する
  - Instagram に投稿したかどうかは関係ない（期限切れで投稿しなかったものも、作った日で決まる期間はアプリに出る）
  - endDate を過ぎたものは、「投稿予定表の更新」（schedule.json と一緒に毎日作り直す）で自動で消える。手で編集しない

## 20時の枠（栄養枠・○○week などのイレギュラー発信）

- 運動・知識・啓発のローテーションとは別枠。朝5時の投稿はそのまま続き、予定がある日だけ20時ごろに追加で投稿する
- category に運動・知識・啓発以外（例："栄養"）を書いた投稿は、自動で20時の枠になる（"newsCategory" がある気になるニュースは除く。下の「気になるニュース」を参照）
- **post.json に "publishDate": "YYYY-MM-DD" を必ず書く**。その日の20時にだけ出る（繰り上げ・ローテーションはしない）
  - publishDate がない・過ぎている・同じ日にほかの20時の投稿があるときは、予定に入らない（`npm run queue` の「予定の変更・注意」に出る）
  - 投稿されずに日付が過ぎた予定は missed として残る。出し直すときは新しい publishDate を書く
- 予定表は schedule.json の "evening"（朝の枠は "days"）。`npm run queue` で「20時の枠」として確認できる
- 起動：GitHub の定時起動が 20:00 と予備の 20:40（日本時間）。GitHub の定時起動は遅れることがあるので、外部サービスからも 20:00 に instagram.yml を inputs `slot=evening` で起動するとよい
  - 外部サービスからの朝 5:00 の起動は今までどおり（slot を送らなければ朝の枠）
- 流れは朝と同じ（カルーセル → リール → Threads → YouTube ショート）
- 確認（投稿はしない）：`gh workflow run instagram.yml -f slot=evening -f dry_run=true -f date=YYYY-MM-DD`
- フォルダ名は作った日＋シリーズ名と番号にする（例：posts/2026-10-07-vitamin-01-a）。表紙のサブタイトルに「ビタミンweek 1/13」のようにシリーズ名と番号を入れる
- ビタミンweek の素材と決まりごとは docs/vitamin-week.md にある

## 気になるニュース（ストック式。医療・介護 20:15／健康 20:30／AI 20:45）

- 毎朝のラジオ（医療・介護、健康、AI）から運営者が頼んだニュースを、読者向けにかみくだいて伝える。内容は「知識」と「啓発」の間くらいになる
- **プルリクエストをマージしたら、時間に関係なくすぐ投稿する**（Instagram カルーセル → リール → Threads。**YouTube には上げない**。ワークフロー「健康ニュースの本番投稿」が instagram.yml を slot＝分野の枠・folder 指定で起動する）
  - アプリ（"app": true）は、作った日の翌日0時から載る（投稿した時刻とは関係ない）
  - PC から main に直接 push したとき（プルリクエストを使わないとき）や、すぐの投稿が失敗したときは、ストックに残り、分野ごとの枠で毎日1件ずつ投稿される
  - 医療・介護 → 20:15（予備 21:15）、健康 → 20:30（予備 21:30）、AI → 20:45（予備 21:45）
  - 20:00 の20時の枠（予備 20:40）と重ならないよう15分ずつずらしている。予備は21時（運営者の脳トレ動画）のあとにまとめている
  - その日にストックがある分野だけ投稿する（ない分野はその日はお休み）
  - 同じ分野に複数あるときは、作った日の古いものから順に出す（同じ日ならフォルダ名の順）
  - **賞味期限は10日**：作った日から10日を過ぎたものは投稿しない（10/21に作ったら10/31まで）。期限までに順番が来ない見込みのものは `npm run queue` の「予定の変更・注意」に出る
  - 作った日にも出せる。ただしその枠の時刻を過ぎていたら翌日から。予定が入った今日は動かない（時刻を過ぎても予備の起動で出る）。投稿されずに日付が過ぎた予定は missed として残り、期限内ならストックに戻る
- post.json に書くこと（"publishDate" は書かない）
  - "category": "健康ニュース"
  - "newsCategory"：**"医療・介護"・"健康"・"AI" のどれか**（これで枠が決まる。書かないと今までどおり20時の枠の扱いになるので、必ず書く）
  - "created"：作った日（"YYYY-MM-DD"。書かなければフォルダ名の日付）
  - "app": true：アプリにも載せるとき（下の「アプリ用ニュース」。AI は対象外）
- 予定表は schedule.json の "newsCare"・"newsHealth"・"newsAi"。`npm run queue` で枠ごとの予定・ストック数・アプリ用ニュースを確認できる
- 確認（投稿はしない）：PC では `node scripts/publish.js --which --slot news-care --date YYYY-MM-DD`（news-health・news-ai も同じ）。Actions では `gh workflow run instagram.yml -f slot=news-care -f dry_run=true -f date=YYYY-MM-DD`
- 外部サービスからも、20:15 に `slot=news-care`、20:30 に `slot=news-health`、20:45 に `slot=news-ai` で instagram.yml を起動するとよい（GitHub の定時起動は遅れることがあるため）
- フォルダを指定して手動で投稿できる：`gh workflow run instagram.yml -f slot=news-care -f folder=フォルダ名`（PC で push したときは、運営者の確認OKのあとこれですぐ出す）
- "newsCategory" がない今までの健康ニュース（2026-10-20 までに作ったもの）は、20時の枠（publishDate）の扱いのまま

### 朝にニュースを頼むときの言い方

- `/news ②……（朝ラジオのメモ）` または `/news 出典のURL` → Instagram・Threads に出す（アプリには載せない）
- 最後に **「アプリにも」** を付ける（例：`/news ②…… アプリにも`）→ "app": true を付ける（AI のニュースのときは付けずに、その旨を伝える）
- あとから付ける・外すとき：「（フォルダ名か見出し）をアプリにも」「（フォルダ名か見出し）はアプリから外して」
- 分野（newsCategory）は、メモの「分野」から決める（医療・介護／健康／AI）。URL だけのときは Claude が内容から決めて報告する。決めてほしいときは「分野：AI」のように書く
- 介護保険など制度の話でも、メモの分野が「医療・介護」なら医療・介護の枠にする

### 作り方（ひな形・文の決まり）
- **読み手を分野で決める**（運営者の決まり。介護される側だけでなく、介護する側にも届けるため）
  - 健康：介護を受ける人・その家族向け（暮らしの中でできること）
  - 医療・介護：内容に合った人向け。事業所の運営・報告・人員・研修など**事業所の内容は、介護職など同業者向け**にまとめる（表紙のサブタイトルに「介護事業所向け」などと入れ、最後のスライドは「現場でできる準備」、ハッシュタグも介護職向けにする）。利用者や家族に関わる制度（利用料・送迎など）は、利用者・家族向け
  - AI：内容に合った人向け（ふだんは利用者・家族向け）
- ひな形は templates/news.html（自動で選ばれる。色は鮮やかな黄緑、フォントはほかと同じ Zen Maru Gothic）
- フォルダ名は作った日＋news-英数字（例：posts/2026-10-16-news-tairyoku）。見本はこのフォルダ
- post.json の形（points・summary・cta は使わず、slides を書く）
  - cover："title"（3行まで。最後の行は明るい緑になる）、"subtitle"（発表元。例：国の体力調査（スポーツ庁））、"date"（例：2026年10月11日発表）
  - slides：2枚目以降。"type" で形を選び、"heading"（上の帯の見出し）と、あれば "lead"（最初の太い文）・"foot"（下の一言）を書く
    - facts：見出しつきの箇条書き。"items": [{ "label", "value" }]
    - bars：棒グラフ。"bars": [{ "label", "value"（数の大きさ）, "display"（棒の上の文字）, "color"（gray・green・orange） }]
    - compare：比べるカード。"cards": [{ "label", "value", "color" }]
    - bignum：大きな数字。"text"、"number"。人の絵を出すときは "people": { "total": 6, "mark": 1 }
    - actions：番号つきの「このニュースの活かし方」。"items"、"note"（注意書き）、"source"（参考）。最後のスライドにする
  - 表紙のシールを替えるときは cover に "sticker": "ファイル名.png"（投稿フォルダか assets/）、消すときは "sticker": false
- 文字量の目安：表紙タイトル1行6文字×3行、lead は \n で1行18文字以内、actions の1項目は1行14文字以内×3行まで。はみ出しそうなときは自動で縮むが、render した画像で必ず確認する
- 根拠のルールは「情報の根拠」と同じ。発表資料（報道発表・PDF）の数字だけを使い、資料で確かめられない数字は使わない
  - 調査の結果を伝えるときは、「関係があった」ことと「効果があった」ことを分けて書く（例：「運動と体力の関係を見た調査で、運動したから体力が上がったとまでは言えません」）
  - 長い期間の傾向と最近の傾向を混ぜて書かない（例：25年では上昇、10年では横ばい）。どちらの期間の話かをはっきり書き、両方を出すときは「25年で見ると上がってきました（ここ10年はほぼ横ばいです）」のように並べて書く。スライド・キャプション・Threads で食い違わないようにする
  - actions の note に「痛みやふらつきがある方は、かかりつけ医にご相談ください。」などの一文を入れる
- キャプションの最初の1行は読者の思い込みや悩みに触れ、次に【気になる健康ニュース】と発表の中身を書く。最後に「参考：機関名「資料名」（年）」
- Threads は今までどおり3連投。threads.json がなければ slides から自動で作る（scripts/threads-lib.js の buildNewsThreadTexts）
  - 1投稿目：問いかけ＋ニュースの見出し・発表元＋最初の「わかったこと」　2投稿目：残りのスライド＋参考　3投稿目：actions＋注意書き
- リールの上下の余白は黄緑。BGM は assets/bgm/news.mp3（甘茶の音楽工房「夏色のキャンパス」）

## スマホ（クラウドの Claude Code）で健康ニュースを作る

- 使い方：スマホの Claude アプリの Code で、このリポジトリを開いて `/news 出典のURL` と送る（PC でも同じコマンド。手順は .claude/commands/news.md）
  - 朝ラジオのメモ（「②」などの番号で始まり、日付・分野・見出し・要約・出典のリンクが書かれた文）を `/news ②……` のように貼ってもよい。メモは出発点として使い、出典の一次資料を開いて深掘りする。見出し・要約の数字も必ず一次資料で確かめ直す
  - PC（gh がある）：画像などを見せて「確認OK」→ push → フォルダ指定で instagram.yml を起動してすぐ投稿、の流れ
  - クラウド（gh がない）：Claude が `news/フォルダ名`（または `claude/` のブランチ）に push するところまで行い、確認はプルリクエストで行う
- push すると、ワークフロー「健康ニュースのプレビュー」（.github/workflows/news-preview.yml）が自動で動く（5分ほど）
  - プルリクエストを作る → render して画像をブランチにコミット → 画像URL・トークンの確認（dry_run）→ リール動画を作ってプレビュー用のリリース（news-preview-フォルダ名）に置く
  - プルリクエストのコメントに、画像・リール動画のリンク・キャプション・Threads 3投稿の文・YouTube のタイトルが貼られる。直して push し直すと、同じコメントが作り直される
  - 健康ニュース（category が "健康ニュース"）のフォルダが変わっていない push では何もしない
- プルリクエストの画像と動画を確認して、よければ GitHub のアプリかブラウザで**マージする（＝本番OK）**
- 気になるニュース（"newsCategory" があるもの）は、マージしたら時間に関係なくすぐ投稿する。ワークフロー「健康ニュースの本番投稿」（.github/workflows/news-publish.yml）が、instagram.yml を slot＝分野の枠（news-care・news-health・news-ai）・folder＝フォルダ名で起動し、各投稿のリンクをプルリクエストにコメントする（YouTube には上げない。アプリは作った日の翌日0時から）
- 以下は "newsCategory" がない今までの健康ニュースのときだけ：マージすると、そのフォルダだけを投稿する（instagram.yml の slot=evening・folder 指定と同じ）
  - 投稿する時間（日本時間）：22時〜翌6時にマージ → 翌朝7時／19時30分〜20時30分にマージ → 20時30分／それ以外 → すぐ
  - 翌朝7時待ちのあいだは、フォルダに news-pending.json が置かれる（7時と予備の7時30分の定時起動で出す。投稿できたら自動で消す）
  - 終わると、各投稿のリンクがプルリクエストにコメントされ、プレビュー用のリリースは消される
  - Threads が途中で止まったときは、続きは自動では出さない（コメントで知らせる）。出すときは Actions の「Threads 連投」を folder 指定で実行する
- クラウドの準備：.claude/settings.json の SessionStart フックが scripts/cloud-setup.sh を動かし、npm ci・Playwright の Chromium・日本語フォントを入れる（PC では何もしない）
  - Claude アプリの環境設定で、ネットワークのアクセスを「フル」にするか、「カスタム」で次を許可しておく：registry.npmjs.org、cdn.playwright.dev、playwright.download.prss.microsoft.com、fonts.googleapis.com、fonts.gstatic.com、archive.ubuntu.com・security.ubuntu.com、api.github.com、出典の公的機関のサイト
  - クラウドで render できなくても、プレビューのワークフローが render するので投稿は作れる
- GitHub の設定「Allow GitHub Actions to create and approve pull requests」（Settings → Actions → General）をオンにしておく（プルリクエストを自動で作るのに必要）

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
