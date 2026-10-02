// gh-pages（GitHub Pages）に置くホームページ・プライバシーポリシー（main の site/ にある）
// gh-pages は毎朝リール動画で上書きされるため、上書きのたびに site/ の中身もコピーして消えないようにする
const fs = require('fs');
const path = require('path');

const SITE = path.join(__dirname, '..', 'site');

function copySite(dest) {
  fs.cpSync(SITE, dest, { recursive: true });
  fs.writeFileSync(path.join(dest, '.nojekyll'), '');
}

module.exports = { copySite };
