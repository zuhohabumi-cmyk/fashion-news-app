# GitHub Pages 配置案

- 配置先（予定）: `zuhohabumi-cmyk/fashion-news-app`
- 公開対象: この `apps/fashion-news/` 内のファイルのみ。リポジトリのルートに置く。
- 更新方式: `.github/workflows/daily_update.yml` が毎日 5:30 JST、`main` へのpush、手動実行で `npm ci` → `npm run build` → GitHub Pages 配置を実行。
- 認証情報: 不要。Gemini と Docker は使用しない。
- Pages設定: リポジトリの Settings → Pages → Build and deployment → Source を GitHub Actions にする。
- 出力先: `public/`。Actionsが生成したページをそのまま配置する。
- 想定URL: `https://zuhohabumi-cmyk.github.io/fashion-news-app/`（実公開後に確認）。

公開前にリポジトリの公開範囲と、アプリ以外のファイルが含まれないことを確認する。`node_modules/` は `.gitignore` で除外する。親ワークスペースの `01_private/`、チケット、PKBは送らない。

## 初回だけ必要な画面操作

GitHub連携は接続済みだが、この連携では新規リポジトリ作成とPages設定の変更ができない。次の2点だけGitHubの画面で行う。

1. [新規リポジトリ作成](https://github.com/new)を開く。
2. Ownerを `zuhohabumi-cmyk`、Repository nameを `fashion-news-app`、Visibilityを `Public` にする。
3. README、`.gitignore`、Licenseの自動作成は選ばず、空の状態で作成する。
4. 作成後、リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする。
5. 完了したらリポジトリのURLを共有する。アプリファイルの配置とActions実行確認はこちらで続ける。

