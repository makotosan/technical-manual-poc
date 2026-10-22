# technical-manual-poc

Markdownから共通HTMLを生成し、そのHTMLをWeb公開とPDF組版に使うミニマルPoCです。

```text
manual/*.md -> Eleventy -> dist-web/index.html -> Vivliostyle -> dist-pdf/manual.pdf
```

## 現在の状態

Issue #3までの構成です。3章のMarkdownをEleventyで変換し、目次付きの単一HTMLとして生成します。
共通HTMLからA4 PDFを生成できます。Actions/PagesはIssue #4、全体の受入確認はIssue #5で実装します。
本文は manual/*.md のみで編集します。JavaScriptを使わず、目次から各章へ移動できます。

既存の technical-manual-publisher は独立した保全対象です。このPoCの作業は専用チェックアウト内で行います。

## 実行環境

- Node.js **24.19.0**（.nvmrc / .node-version）
- npm **10.7.0**（packageManager / engines）
- Eleventy **3.1.7**（package-lock.jsonで依存関係を固定）

上記バージョンのNode/npmを用意し、リポジトリのルートで実行します。

```sh
npm ci
npm run dev
```

開発サーバーが表示するURLの /technical-manual-poc/ を開きます。通常は http://localhost:8080/technical-manual-poc/ です。
停止は Ctrl+C です。

```sh
npm run build:web
npm test
```

出力は dist-web/ です。npm test はHTMLとPDFを生成し、章順・見出しID・章アンカー・素材・HTML再ビルドの一致・PDF形式とA4サイズ・ローカル配信を確認します。

```sh
npm run build:pdf
```

HTMLを新規生成してから dist-pdf/manual.pdf を出力します。初回は固定バージョンのChromeが自動取得されるため、ネットワーク接続が必要です。

## ファイル構成

| 場所 | 用途 |
| --- | --- |
| manual/01-introduction.md | はじめに |
| manual/02-safety.md | 安全上の注意 |
| manual/03-operation.md | 操作方法 |
| manual/assets/ | 自作の架空PNG/SVGテスト素材 |
| src/index.njk | 3章の本文と目次を統合するページ |
| src/_includes/layout.njk | 共通HTMLレイアウト |
| styles/web.css | 画面用CSS |
| eleventy.config.js | 入出力、素材コピー、Pagesサブパス |
| dist-web/ | 生成HTMLと素材（Git管理外） |
| dist-pdf/ | 生成PDF（Git管理外） |

原稿はUTF-8です。原稿・素材は架空の公開テスト用とし、顧客情報や機密情報を入れないでください。
サンプル原稿の assets/ 参照は、Issue #2で統合する index.html を基準としたパスです。

## 実装契約と進め方

- 3つのMarkdownだけを本文の編集元にし、Eleventyで1つのHTMLにまとめます。
- PDFは公開用HTMLを入力にし、Markdownを別途変換しません。
- 画面と印刷の差分はCSSで扱います。
- Pagesの /technical-manual-poc/ と同じサブパスでローカルPDF生成を検証します。
- 日本語フォントとChromeは以下のバージョンに固定しています。
- CMS、認証、DB、多言語、製品バリエーションは対象外です。
- #1 → #2 → #3 → #4 → #5の順で、各IssueのブランチとPRを作成し、人によるレビュー後にマージします。

Pagesの設定・公開URL・PDFダウンロード・全体のロールバック手順は後続Issueで追記します。

## 共通HTMLの契約

- 出力HTMLは dist-web/index.html の1つだけです。章単位のHTMLは生成しません。
- manual/manual.11tydata.json の permalink: false により、章はEleventyのコレクション用としてのみ処理します。
- 章順は eleventy.config.js に明示しています。3章の欠落・追加はビルドエラーにします。
- 各章は先頭の # 見出しを必須とし、それを目次タイトルとして使います。本文のテンプレート構文処理と生HTMLは無効です。
- 章IDはファイル名（例: 01-introduction）、見出しIDは章ID-heading-連番です。章内で見出しを挿入・移動すると見出し連番は変わります。長期的な章リンクには章IDを使ってください。
- 変換済みHTMLの見出しレベルを1段下げ、章ごとのIDを付けます。この処理は lib/chapters.mjs にあり、追加のMarkdown変換はしません。
- 原稿の画像参照は assets/ファイル名、CSSは /technical-manual-poc/styles/web.css です。同じHTMLを /technical-manual-poc/ でHTTP配信すると双方が解決します。
- 共通の構造は .manual-header、.chapter-nav、.chapter です。印刷CSSはこれらを使って改ページや目次の表示を調整し、HTML本文を書き換えません。
- PDF入力はこのHTMLです。印刷用HTMLを別途生成せず、PDF生成時にも公開先Pagesを取得しません。
## PDF生成と実行前提

- Vivliostyle CLI 11.4.0、Chrome for Testing 155.0.8059.84を使用します。CLIが最初の実行時にOS別ブラウザーをユーザーキャッシュへ自動取得し、以後再利用します。
- Windowsでは上記Node/npmに加え、ブラウザーを実行できる環境が必要です。Linux CIではChrome実行に必要な共有ライブラリも必要です。Actionsへの導入と確認はIssue #4で行います。
- 日本語は @fontsource/noto-sans-jp 5.3.1 のNoto Sans JP（400/700）です。フォントとCSSを dist-web/fonts/ へコピーし、ローカルHTTP経由で読み込みます。フォントのライセンスはSIL Open Font License 1.1で、配布物の fonts/LICENSE に含めます。
- 原稿・画像・フォントを含むビルド成果物を127.0.0.1の空きポートで /technical-manual-poc/ に配信します。PDF完成後または失敗時にサーバーを終了します。公開済みPagesは参照しません。
- styles/print.css をVivliostyleの追加CSSとして指定します。A4、余白、ページ番号、章開始時の改ページを設定し、目次を含む4ページを生成します（原稿が増えればページ数も増えます）。
- PDF生成前後で dist-web/index.html のSHA256を比較し、不変を確認します。成功時はハッシュとページ数を表示し、失敗時は不完全なPDFを削除して終了します。
- PDFのバイト単位の再現性は要求しません。日時などのメタデータは変動します。

HTMLを再ビルドせず、その成果物をPDF化するCI向けコマンド:

```sh
npm run build:web
npm run build:pdf:from-html
npm run check:pdf
```

npm run check:pdf はPDFの解析可否、複数ページ、全ページのA4サイズを確認します。
npm test も同じ順で生成・検証します。PDFを表示するには dist-pdf/manual.pdf を通常のPDFビューアーで開いてください。

## PDFの目視確認

1. 目次と3章が順序どおりにあり、各章が改ページされること。
2. 日本語が欠落・文字化けせず、見出し・本文・ページ番号が読めること。
3. 第1章のSVG装置図、第2章のPNG色見本、第1章の表が欠落・はみ出しなく表示されること。
4. PDF入力の共通HTMLが変更されていないという成功ログを確認すること。

ローカルで4ページすべてを画像化して確認済みです。自動検査だけでは文字の欠落や見切れをすべて判定できないため、原稿や印刷CSS変更後は目視確認も行ってください。
## GitHub Actions / Pages

.github/workflows/publish.yml が次の処理を行います。

| 起動条件 | 動作 |
| --- | --- |
| Pull request | HTMLを1回生成 → そのHTMLからPDF生成 → 成果物テスト → PDFをActions成果物として保存 |
| mainへのpush | 上記の検証後、同じHTMLをPages成果物にして公開 |
| 手動実行（main） | mainと同じ処理。Pages設定後の再実行にも使えます |
| 手動実行（main以外） | ビルド・検証とPDF保存のみ。Pagesへは公開しません |

CIはUbuntu 24.04、Node 24.19.0、npm 10.7.0です。
lockfileに含まれるPuppeteerブラウザー管理ツールを使い、固定ChromeとLinux実行ライブラリを導入します。
公式Actionsはコメントにリリース番号を記載し、実行対象をコミットSHAで固定しています。

CIは npm run test:artifacts を使い、生成済みHTML/PDFを再ビルドせずに検査します。
再ビルドの一致検証は npm run check:reproducibility に分離し、通常の npm test には引き続き含めています。
PDF前のHTMLハッシュ、検証後のハッシュ、Pagesアップロード用tar内のHTMLを比較します。

### リポジトリ設定

1. GitHubの Settings → Actions → General でActionsを許可し、ワークフローで使用している公式 actions/* を実行可能にします。
2. Settings → Pages → Build and deployment → Source を GitHub Actions にします。
3. github-pages環境にブランチ制限を設ける場合はmainを許可します。既存のレビュー保護がある場合はその承認が必要です。
4. PRの Build and test HTML and PDF が成功したことを確認し、人のレビュー後にmainへマージします。
5. mainの Publish manual 実行で Deploy GitHub Pages が成功したことを確認します。

想定公開URL: https://makotosan.github.io/technical-manual-poc/
実際の公開確認は初回mainデプロイ成功後に行います。

### PDFの取得と失敗時の対応

Actions → Publish manual → 対象の成功実行 → Artifacts → manual-pdf をダウンロードし、ZIP内のmanual.pdfを開きます。
PDF成果物の保持期間は14日です。期限切れの場合はmainでワークフローを再実行してください。
github-pages成果物はデプロイ用で、PDFとは別です。

PRでデプロイジョブは実行しません。pages: write / id-token: write はmainのデプロイジョブだけに付与します。
PRチェックが失敗するとジョブは失敗します。マージの強制的な禁止は、別途ブランチ保護の必須チェックが設定されている場合に限ります。

初回のPages公開が失敗した場合はSourceと環境設定を確認し、Actionsからmainの失敗ジョブまたはワークフローを再実行します。
公開内容を戻す場合は、対象PRのマージをrevertするPRをレビュー・マージし、mainの自動デプロイ成功を確認します。
このPoCは公開用の架空原稿のみを扱い、独自の秘密鍵や顧客情報を必要としません。
