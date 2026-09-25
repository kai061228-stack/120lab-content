# セットアップ（Windows・最初の1回だけ）

1. Node.js を入れる
   PowerShell を開いて、次を実行します。
   winget install OpenJS.NodeJS.LTS
   終わったら PowerShell を一度閉じて、開き直します。

2. このフォルダを置く
   例：ドキュメントの中に 120lab-content として置く

3. 必要な部品を入れる
   PowerShell で次を順に実行します。
   cd $HOME\Documents\120lab-content
   npm install
   npx playwright install chromium

4. 試しに画像を作る
   npm run render -- posts/2026-09-26-tsumazuki
   posts\2026-09-26-tsumazuki\images に画像が5枚できれば成功です。

# 普段の使い方

1. PowerShell でこのフォルダに移動して claude を起動します。
2. 「〇〇について投稿を作って」と頼みます。
3. できた画像と caption.txt を確認し、Meta Business Suite で予約投稿します。
