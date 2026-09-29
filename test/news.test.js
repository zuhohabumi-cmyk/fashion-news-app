const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { classify, deduplicate, fromFeedItem, isFashionRelevant } = require('../lib/articles');
const { build, fetchArticles, makeHtml } = require('../scripts/build');

const feeds = [{ id:'one', name:'One', url:'https://one.example/rss' }, { id:'two', name:'Two', url:'https://two.example/rss' }];
const item = (title, link, pubDate = '2026-09-29T02:00:00Z') => ({ title, link, pubDate, contentSnippet:'9月29日から東京で発売。' });

test('6分類と記事ID、追跡パラメータの除去', () => {
  assert.equal(classify('Nike 新作スニーカーを発売'), 'スニーカー');
  assert.equal(classify('ブランドAとブランドBがコラボ'), 'コラボ');
  assert.equal(classify('渋谷にポップアップをオープン'), '店舗・ポップアップ');
  assert.equal(classify('新作バッグを発売'), '新作・発売');
  assert.equal(classify('秋冬の着こなしトレンド'), 'トレンド');
  assert.equal(classify('ブランドの新体制'), 'ファッション');
  assert.equal(classify('プーマ × サタデーズの新作'), 'コラボ');
  const a = fromFeedItem(feeds[0], item('新作バッグを発売','https://one.example/a?utm_source=x'));
  const b = fromFeedItem(feeds[0], item('新作バッグを発売','https://one.example/a?utm_source=y'));
  assert.equal(a.id, b.id);
  assert.equal(a.link, 'https://one.example/a');
});

test('媒体カテゴリと見出しで明らかな別ジャンルを除外する', () => {
  assert.equal(isFashionRelevant({id:'wwdjapan'}, {categories:['ビューティ','香水＆ネイル'],title:'香水発売'}), false);
  assert.equal(isFashionRelevant({id:'wwdjapan'}, {categories:['ニュース','ファッション'],title:'バッグ発売'}), true);
  assert.equal(isFashionRelevant({id:'hypebeast-jp'}, {categories:['ミュージック'],title:'音楽イベント'}), false);
  assert.equal(isFashionRelevant({id:'hypebeast-jp'}, {categories:['フットウエア'],title:'新作シューズ'}), true);
  assert.equal(isFashionRelevant({id:'fashionsnap'}, {title:'新型トースターを発売'}), false);
});

test('同一URLと異なる媒体の同一見出しを重複排除する', () => {
  const a = fromFeedItem(feeds[0], item('東京の新作スニーカーが登場','https://one.example/a'));
  const sameUrl = fromFeedItem(feeds[0], item('東京の新作スニーカーが登場','https://one.example/a?utm_medium=rss'));
  const sameStory = fromFeedItem(feeds[1], item('東京の新作スニーカーが登場！','https://two.example/b'));
  const other = fromFeedItem(feeds[1], item('大阪の新店舗がオープン','https://two.example/c'));
  assert.deepEqual(deduplicate([a,sameUrl,sameStory,other]).map(x => x.link), [a.link,other.link]);
});

test('片方のRSSが失敗しても続行し、全件失敗ならページを上書きしない', async () => {
  const articles = await fetchArticles(feeds, async url => {
    if (url.includes('one')) throw new Error('timeout');
    return { items:[item('新作発売','https://two.example/a')] };
  });
  assert.equal(articles.length, 1);
  await assert.rejects(() => fetchArticles(feeds, async () => { throw new Error('timeout'); }), /すべてのRSS取得に失敗/);
});

test('埋め込みJSONはスクリプトを閉じず、ビルドで記事を表示できる', async () => {
  assert.match(makeHtml('__NEWS_DATA__', { title:'</script><script>alert(1)</script>' }), /\\u003c\/script>/);
  const output = path.resolve(__dirname,'../public/index.html');
  const old = fs.existsSync(output) ? fs.readFileSync(output) : null;
  try {
    const data = await build({ feeds, parse:async url => ({ items: url.includes('one') ? [item('限定バッグ発売','https://one.example/a')] : [item('渋谷に新店舗','https://two.example/b')] }) });
    assert.equal(data.articles.length, 2);
    assert.equal(data.articles.filter(article => article.isTop10).length, 2);
    assert.equal(data.articles[0].titleJa, undefined);
    assert.equal(data.articles[0].points, undefined);
    assert.match(fs.readFileSync(output,'utf8'), /Fashion News/);
  } finally {
    if (old) fs.writeFileSync(output, old); else fs.rmSync(output, { force:true });
  }
});

