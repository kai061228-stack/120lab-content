// Instagram 投稿（post.json）から Threads 連投用の3つの文章を組み立てる
// 新しい内容は足さず、Instagram と同じテーマ・同じ根拠（キャプション・ポイント・まとめ・参考）だけを使う
//   1投稿目：キャプション冒頭の問いかけ＋結論（ポイントの見出し）＋トピックタグ1つ＋BGMクレジット
//   2投稿目：理由・根拠（各ポイントの本文）＋参考
//   3投稿目：今日からできること（まとめの項目）＋注意書き
const MAX_CHARS = 500;
const BGM_CREDIT = 'BGM：甘茶の音楽工房';
const REQUIRED_TAGS = ['120歳まで歩く', '理学療法士'];
const NUM = ['①', '②', '③', '④', '⑤'];

const oneLine = (s) => s.replace(/\n/g, '');
const len = (s) => [...s].length;

// トピックタグはテーマに近いもの1つ（必須タグ以外の最初のもの）。Threads で使えない記号は除く
function topicTag(post) {
  const tag = (post.hashtags || []).find((t) => !REQUIRED_TAGS.includes(t)) || '';
  const clean = tag.replace(/[#\s.&＆・、。]/g, '');
  return clean ? '#' + clean : '';
}

function buildThreadTexts(post) {
  const lines = post.caption.split('\n').map((l) => l.trim());
  const question = lines.find((l) => l) || oneLine(post.cover.title);
  const sources = lines.find((l) => l.startsWith('参考：')) || '';
  const tag = topicTag(post);
  const heads = post.points.map((p) => oneLine(p.heading));

  const t1 = [
    question,
    `今日のテーマは「${oneLine(post.cover.title)}」（${post.cover.subtitle}）。\nポイントは${heads.length}つです。\n` +
      heads.map((h) => '・' + h).join('\n'),
    [tag, BGM_CREDIT].filter(Boolean).join('\n'),
  ].join('\n\n');

  const t2 = [
    `${heads.length}つのポイントを、ひとつずつ説明します。`,
    ...post.points.map((p, i) => `${NUM[i] || i + 1 + '.'} ${heads[i]}\n${oneLine(p.body)}`),
    sources,
  ].filter(Boolean).join('\n\n');

  const safety = post.category === '運動' && !/中止/.test(post.summary.note)
    ? '無理をせず、痛みが出たら中止してください。回数は体力に合わせて調整してください。' : '';
  const t3 = [
    '今日からできること',
    post.summary.items.map((s) => '・' + s).join('\n'),
    [safety, oneLine(post.summary.note)].filter(Boolean).join('\n'),
  ].join('\n\n');

  const texts = [t1, t2, t3];
  texts.forEach((t, i) => {
    if (len(t) > MAX_CHARS) throw new Error(`${i + 1}投稿目が${MAX_CHARS}字を超えました（${len(t)}字）。threads.json を手で書いてください`);
  });
  return texts;
}

module.exports = { buildThreadTexts, MAX_CHARS, BGM_CREDIT };
