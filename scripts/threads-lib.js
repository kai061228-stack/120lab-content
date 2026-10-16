// Instagram 投稿（post.json）から Threads 連投用の3つの文章を組み立てる
// 新しい内容は足さず、Instagram と同じテーマ・同じ根拠（キャプション・ポイント・まとめ・参考）だけを使う
//   1投稿目：キャプション冒頭の問いかけ＋結論（ポイントの見出し）＋トピックタグ1つ＋BGMクレジット
//   2投稿目：理由・根拠（各ポイントの本文）＋参考
//   3投稿目：今日からできること（まとめの項目）＋注意書き
// 気になる健康ニュース（post.json に slides がある投稿）は、slides から組み立てる（buildNewsThreadTexts）
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

// 気になる健康ニュース（slides がある投稿）の1枚分を文章にする
function slideText(s) {
  const o = (t) => oneLine(String(t ?? ''));
  // bignum は「lead＋text＋大きな数字」で1つの文になるので、続けてつなぐ
  if (s.type === 'bignum') return [o(s.lead) + o(s.text) + o(s.number), o(s.foot)].filter(Boolean).join('\n');
  const parts = [o(s.lead)];
  if (s.type === 'facts') parts.push((s.items || []).map((it) => `・${o(it.label)}：${o(it.value)}`).join('\n'));
  if (s.type === 'bars') parts.push((s.bars || []).map((b) => `${o(b.label)} ${o(b.display ?? b.value)}`).join('、'));
  if (s.type === 'compare') parts.push((s.cards || []).map((k) => `${o(k.label)} ${o(k.value)}`).join('、'));
  parts.push(o(s.foot));
  return parts.filter(Boolean).join('\n');
}

// 気になる健康ニュース：slides から3つの文章を組み立てる
//   1投稿目：キャプション冒頭の問いかけ＋ニュースの見出し・発表元＋最初の「わかったこと」＋トピックタグ1つ＋BGMクレジット
//   2投稿目：調査のくわしい中身（残りのスライド）＋参考
//   3投稿目：このニュースの活かし方（actions のスライド）＋注意書き
function buildNewsThreadTexts(post) {
  const lines = post.caption.split('\n').map((l) => l.trim());
  const question = lines.find((l) => l) || oneLine(post.cover.title);
  const sources = lines.find((l) => l.startsWith('参考：')) || '';
  const tag = topicTag(post);
  const label = post.cover.tag || '気になる健康ニュース';
  const actions = post.slides.find((s) => s.type === 'actions');
  const rest = post.slides.filter((s) => s.type !== 'actions');
  const first = rest.find((s) => s.type !== 'facts') || rest[0];
  const from = [post.cover.subtitle, post.cover.date].filter(Boolean).map(oneLine);

  const t1 = [
    question,
    [`【${label}】${oneLine(post.cover.title)}`, ...from].join('\n'),
    first ? slideText(first) : '',
    [tag, BGM_CREDIT].filter(Boolean).join('\n'),
  ].filter(Boolean).join('\n\n');

  const t2 = [
    ...rest.filter((s) => s !== first).map((s) => `▼${oneLine(s.heading)}\n${slideText(s)}`),
    sources,
  ].filter(Boolean).join('\n\n');

  const t3 = actions ? [
    oneLine(actions.heading || 'このニュースの活かし方'),
    (actions.items || []).map((t, i) => `${NUM[i] || i + 1 + '.'}${oneLine(t)}`).join('\n'),
    oneLine(actions.note || ''),
  ].filter(Boolean).join('\n\n') : '';

  return check([t1, t2, t3]);
}

function check(texts) {
  texts.forEach((t, i) => {
    if (!t) throw new Error(`${i + 1}投稿目の文章がありません。threads.json を手で書いてください`);
    if (len(t) > MAX_CHARS) throw new Error(`${i + 1}投稿目が${MAX_CHARS}字を超えました（${len(t)}字）。threads.json を手で書いてください`);
  });
  return texts;
}

function buildThreadTexts(post) {
  if (Array.isArray(post.slides)) return buildNewsThreadTexts(post);
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

  return check([t1, t2, t3]);
}

module.exports = { buildThreadTexts, MAX_CHARS, BGM_CREDIT };
