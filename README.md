# technical-manual-poc

Markdownから共通HTMLを生成し、そのHTMLをWeb公開とPDF組版に使うミニマルPoCです。

```text
manual/*.md -> Eleventy -> dist-web/index.html -> Vivliostyle -> dist-pdf/manual.pdf
```

## 現在の状態

Issue #2までの構成です。3章のMarkdownをEleventyで変換し、目次付きの単一HTMLとして生成します。
共通HTMLからのPDF生成はIssue #3、Actions/PagesはIssue #4、全体の受入確認はIssue #5で実装します。
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

出力は dist-web/ です。npm test はHTMLを再生成し、3章の順序・一意な見出しID・章アンカー・ローカルリンクと素材・再ビルドの一致・PDF未実装時のエラーを確認します。

```sh
npm run build:pdf
```

現段階では「未実装」を明示して終了コード1を返します。PDFは生成しません。

## ファイル構成

| 場所 | 用途 |
| --- | --- |
| manual/01-introduction.md | はじめに |
| manual/02-safety.md | 安全上の注意 |
| manual/03-operation.md | 操作方法 |
| manual/assets/ | 自作の架空PNG/SVGテスト素材 |
| src/index.njk | 3章の本文と目次を統合するページ |
| src/_includes/layout.njk | 共通HTMLレイアウト |
| styles/web.css | 画面用CSS（印刷用CSSはIssue #3） |
| eleventy.config.js | 入出力、素材コピー、Pagesサブパス |
| dist-web/ | 生成HTMLと素材（Git管理外） |
| dist-pdf/ | 後続Issueで生成するPDF（Git管理外） |

原稿はUTF-8です。原稿・素材は架空の公開テスト用とし、顧客情報や機密情報を入れないでください。
サンプル原稿の assets/ 参照は、Issue #2で統合する index.html を基準としたパスです。

## 実装契約と進め方

- 3つのMarkdownだけを本文の編集元にし、Eleventyで1つのHTMLにまとめます。
- PDFは公開用HTMLを入力にし、Markdownを別途変換しません。
- 画面と印刷の差分はCSSで扱います。
- Pagesの /technical-manual-poc/ と同じサブパスでローカルPDF生成を検証します。
- 日本語フォントとChromiumの固定・導入手順はIssue #3で確定します。
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
- 共通の構造は .manual-header、.chapter-nav、.chapter です。Issue #3の印刷CSSはこれらを使って改ページや目次の表示を調整し、HTML本文を書き換えません。
- PDF入力はこのHTMLです。印刷用HTMLを別途生成せず、PDF生成時にも公開先Pagesを取得しません。