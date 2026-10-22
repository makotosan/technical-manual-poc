# technical-manual-poc

Markdownから共通HTMLを生成し、そのHTMLをWeb公開とPDF組版に使うミニマルPoCです。

```text
manual/*.md -> Eleventy -> dist-web/index.html -> Vivliostyle -> dist-pdf/manual.pdf
```

## 現在の状態

Issue #1の初期構成です。Eleventyの起動・静的ページ生成と、架空の3章原稿・PNG/SVG素材を用意しています。
3章の本文統合と章アンカーはIssue #2、共通HTMLからのPDF生成はIssue #3、Actions/PagesはIssue #4、全体の受入確認はIssue #5で実装します。
現在のHTMLは初期ページであり、3章の本文はまだ表示しません。

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

出力は dist-web/ です。npm test はHTMLを再生成し、日本語ページ・サブパス付きCSS・画像のコピーとPDF未実装時のエラーを確認します。

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
| src/index.njk | 初期ページ（本文統合はIssue #2） |
| src/_includes/layout.njk | 共通HTMLレイアウト |
| styles/web.css | 画面用CSS |
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
