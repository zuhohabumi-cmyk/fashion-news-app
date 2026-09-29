const fs = require('node:fs');
const path = require('node:path');
const Parser = require('rss-parser');
const { CATEGORIES, deduplicate, fromFeedItem, isFashionRelevant } = require('../lib/articles');

const root = path.resolve(__dirname, '..');
const parser = new Parser();

async function parseFeed(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Fashion News Reader/1.0' },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parser.parseString(await response.text());
}

async function fetchArticles(feeds, parse = parseFeed) {
  const all = [];
  let successfulFeeds = 0;
  for (const feed of feeds) {
    try {
      const result = await parse(feed.url);
      successfulFeeds++;
      const items = (result.items || []).slice(0, 50).filter(item => isFashionRelevant(feed, item)).slice(0, 15);
      const articles = items.map(item => fromFeedItem(feed, item)).filter(Boolean);
      all.push(...articles);
      console.log(`[RSS] ${feed.name}: ${articles.length}件`);
    } catch (error) {
      console.warn(`[RSS] ${feed.name}: 取得失敗 (${error.message})`);
    }
  }
  if (feeds.length && !successfulFeeds) throw new Error('すべてのRSS取得に失敗したため、前回のページを保持します');
  return deduplicate(all).slice(0, 40);
}

function makeHtml(template, data) {
  const safeJson = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return template.replace('__NEWS_DATA__', safeJson);
}

async function build({ feeds, parse } = {}) {
  const sources = feeds || JSON.parse(fs.readFileSync(path.join(root, 'data', 'feeds.json'), 'utf8'));
  const articles = await fetchArticles(sources, parse);
  const topIds = new Set(articles.slice(0, 10).map(article => article.id));
  const data = {
    updatedAt: new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
    categories: CATEGORIES,
    articles: articles.map(article => ({ ...article, isTop10: topIds.has(article.id) }))
  };
  const template = fs.readFileSync(path.join(root, 'scripts', 'template.html'), 'utf8');
  const output = path.join(root, 'public', 'index.html');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, makeHtml(template, data), 'utf8');
  console.log(`[Build] ${data.articles.length}件を ${output} に保存しました`);
  return data;
}

if (require.main === module) build().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { build, fetchArticles, makeHtml };

