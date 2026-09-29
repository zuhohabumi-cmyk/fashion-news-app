# Fashion News

既存の `apps/ai_daily_news/` の公開方式を参考にした、独立したファッションニュースアプリです。公開RSSの見出しと抜粋を表示し、GeminiやAPIキーは使いません。

## 使い方

Node.js 20 以上で `apps/fashion-news/` に移動し、次を実行します。

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run serve
```

ブラウザで `http://127.0.0.1:4174` を開きます。`build` は3媒体のRSSを取得し、重複を除いて `public/index.html` を更新します。`serve` は生成済みページを表示するだけです。すべてのRSS取得に失敗した場合は、既存のページを上書きせず終了します。

## GitHub Actionsでの毎朝更新

このアプリのみを独立したGitHubリポジトリのルートへ配置すると、`.github/workflows/daily_update.yml` が毎日5:30 JSTにRSSを取得し、`public/` をGitHub Pagesへ反映します。`main` へのpushや Actions 画面からの手動実行でも更新できます。APIキーは不要です。

GitHubリポジトリ側では **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にします。公開するのはアプリ内のファイルだけです。親ワークスペースのチケット、PKB、`01_private/` は含めません。新リポジトリへの初回配置とPages設定は別途実施します。

## 初期情報源と分類

`data/feeds.json` に FASHIONSNAP、Hypebeast Japan、WWDJAPAN のRSSを設定しています。Fashion Press はRSSの入口を確認できず、初期設定から外しています。情報源の確認状況は `04_resources/20260929-fashion-news-sources.md` を参照してください。

媒体側にカテゴリがある場合はファッション・フットウエア関連だけを採用します。カテゴリがないFASHIONSNAPは、見出しから明らかな別ジャンルの記事を除外します。分類は見出しの語句から自動判定し、ファッション、スニーカー、コラボ、新作・発売、店舗・ポップアップ、トレンドの6つに分けます。複数該当する場合はスニーカー、コラボ、店舗・ポップアップ、トレンド、新作・発売の順に選びます。記事の既読状態はブラウザ内に保存し、AIニュースアプリとは別の保存領域を使います。

## 構成

- `lib/articles.js`: RSS項目の正規化、分類、重複排除
- `scripts/build.js`: RSS取得、分類、静的ページ生成
- `scripts/template.html`: スマホ対応UI
- `scripts/serve.js`: ローカル確認用サーバー

共通処理を将来 core 化する際は `lib/` の処理を切り出せます。

