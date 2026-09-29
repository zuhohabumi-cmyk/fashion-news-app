const crypto = require('node:crypto');

const CATEGORIES = ['ファッション', 'スニーカー', 'コラボ', '新作・発売', '店舗・ポップアップ', 'トレンド'];

function cleanText(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|ref$|source$)/i.test(key)) url.searchParams.delete(key);
    }
    url.pathname = url.pathname.replace(/\/$/, '') || '/';
    return url.toString();
  } catch { return ''; }
}

function titleKey(title) {
  return cleanText(title).normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
}

function similarity(a, b) {
  if (a === b) return 1;
  if (a.length < 8 || b.length < 8) return 0;
  const grams = value => new Set(Array.from({ length: value.length - 1 }, (_, i) => value.slice(i, i + 2)));
  const x = grams(a), y = grams(b);
  let common = 0;
  for (const gram of x) if (y.has(gram)) common++;
  return (2 * common) / (x.size + y.size);
}

function classify(title) {
  const text = cleanText(title).normalize('NFKC').toLowerCase();
  if (/スニーカー|sneaker|air jordan|エアジョーダン|new balance|ニューバランス|フットウェア|フットウエア/.test(text)) return 'スニーカー';
  if (/コラボ|コラボレーション|\bcollab(?:oration)?\b|\s[×x]\s/.test(text)) return 'コラボ';
  if (/ポップアップ|popup|pop-up|新店舗|旗艦店|出店|オープン|開店/.test(text)) return '店舗・ポップアップ';
  if (/トレンド|流行|着こなし|スタイリング|ランウェイ|コレクション|fashion week/.test(text)) return 'トレンド';
  if (/新作|発売|リリース|予約|販売開始|先行販売|新色|新登場/.test(text)) return '新作・発売';
  return 'ファッション';
}

function isFashionRelevant(feed, item) {
  const categories = Array.isArray(item.categories) ? item.categories : [];
  if (feed.id === 'hypebeast-jp') return categories.some(category => /ファッション|フットウエア|フットウェア/.test(category));
  if (feed.id === 'wwdjapan') return categories.some(category => /ファッション/.test(category));
  const title = cleanText(item.title);
  return !/香り|香水|フレグランス|コスメ|スキンケア|化粧|ヘアケア|乳がん|トースター|家電|グルメ|映画|ベビーカー/.test(title);
}

function fromFeedItem(feed, item) {
  const link = normalizeUrl(item.link || item.guid);
  const title = cleanText(item.title);
  if (!link || !title) return null;
  const date = new Date(item.isoDate || item.pubDate || '');
  const timestamp = Number.isFinite(date.getTime()) ? date.getTime() : 0;
  return {
    id: crypto.createHash('sha256').update(link).digest('hex').slice(0, 20),
    sourceId: feed.id,
    sourceName: feed.name,
    category: classify(title),
    title,
    link,
    snippet: cleanText(item.contentSnippet || item.summary || item.content).slice(0, 240),
    timestamp,
    pubDate: timestamp ? new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date) : '日時不明'
  };
}

function deduplicate(articles) {
  const sorted = [...articles].sort((a, b) => b.timestamp - a.timestamp);
  const unique = [];
  const seenUrls = new Set();
  for (const article of sorted) {
    if (seenUrls.has(article.link)) continue;
    const key = titleKey(article.title);
    if (unique.some(existing => {
      if (Math.abs(existing.timestamp - article.timestamp) > 7 * 86400000) return false;
      const other = titleKey(existing.title);
      return key && (key === other || similarity(key, other) >= 0.82);
    })) continue;
    seenUrls.add(article.link);
    unique.push(article);
  }
  return unique;
}

module.exports = { CATEGORIES, classify, deduplicate, fromFeedItem, isFashionRelevant, normalizeUrl };

