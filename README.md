# technical-manual-poc

3章のMarkdownをEleventyで1つのHTMLにまとめ、その同じHTMLをWeb公開とVivliostyle PDF組版に使うミニマルPoCです。

```text
manual/*.md + manual/assets/
              ↓ Eleventy
        dist-web/index.html
         ├─ GitHub Pages
         └─ Vivliostyle + styles/print.css → dist-pdf/manual.pdf
```

公開サイト: https://makotosan.github.io/technical-manual-poc/

Issue #1〜#4の実装・公開確認を完了しています。Issue #5の受入確認と引き継ぎ資料はレビュー対象です。
PoC v0.1の完了は受入条件の充足と最終PRのレビュー・マージ後に判断します。
[受入結果と引き継ぎ](docs/acceptance.md)を参照してください。

## セットアップ

- Node.js **24.19.0**（.node-version / .nvmrc）
- npm **10.7.0**（packageManager / engines）
- Eleventy **3.1.7**
- Vivliostyle CLI **11.4.0**
- Chrome for Testing **155.0.8059.84**
- Noto Sans JP **5.3.1**（400 / 700）

```sh
git clone https://github.com/makotosan/technical-manual-poc.git
cd technical-manual-poc
node --version
npm --version
npm ci
npm run dev
```

指定バージョンのNode/npmを用意してから実行します。必要なら npm install --global npm@10.7.0 でnpmを合わせます。
開発サーバーが表示する /technical-manual-poc/ を開きます（通常 http://localhost:8080/technical-manual-poc/）。停止はCtrl+Cです。
初回PDF生成時には固定Chromeをユーザーキャッシュへ自動取得するため、ネットワーク接続が必要です。
LinuxではChrome用共有ライブラリが必要です。Ubuntu 24.04の導入コマンドは .github/workflows/publish.yml のブラウザー導入ステップを参照してください。

## コマンド

| コマンド | 動作 |
| --- | --- |
| npm run dev | 監視・開発サーバー |
| npm run build:web | 共通HTML・素材・フォントを生成 |
| npm run build:pdf | HTMLを新規生成してからPDF化 |
| npm run build:pdf:from-html | 既存HTMLを変更せずPDF化。CI用 |
| npm run check:pdf | PDFの解析・複数ページ・A4サイズを検証 |
| npm run test:artifacts | 既存HTML/PDFの章順・本文・アンカー・素材を検証。再ビルドしない |
| npm run check:reproducibility | 未変更原稿の再ビルドでHTMLが一致することを検証 |
| npm run test:propagation | 一時コピーで文章・画像参照を変更し、HTML/PDF両方への反映を検証 |
| npm test | HTML/PDF生成、成果物検査、再現性と変更伝播をまとめて検証 |

通常の生成物は dist-web/ と dist-pdf/、変更伝播テストの確認画像は dist-acceptance/ に出ます。すべてGit管理外です。
PDFバイト列の完全一致は要求しません。生成日時などは変動します。

## 原稿を編集する

本文はUTF-8の manual/*.md のみで編集します。画像は manual/assets/ に配置します。
原稿中の画像参照は assets/ファイル名 とし、出力先の index.html を基準に解決します。
生成されたHTMLやPDFを直接編集しないでください。

章順は eleventy.config.js に明示した次の3章です。欠落・追加はエラーになります。

1. manual/01-introduction.md — はじめに
2. manual/02-safety.md — 安全上の注意
3. manual/03-operation.md — 操作方法

各章は先頭に1つの # 見出しを置き、目次のタイトルにも使います。
見出し、表、リスト、リンク、ローカルPNG/SVGを使えます。生HTMLとMarkdown内のテンプレート構文処理は無効です。
章リンクは #01-introduction などのファイル名です。見出しIDは章名-heading-連番で、見出しの挿入や並べ替えで連番が変わります。

## ファイル構成

| 場所 | 用途 |
| --- | --- |
| manual/ | 本文3章と入力画像 |
| src/index.njk | 章と目次を単一HTMLへ統合 |
| src/_includes/layout.njk | lang=jaの共通HTML |
| lib/chapters.mjs | 変換済みHTMLの見出しレベル・IDの調整 |
| styles/web.css / print.css | 画面 / A4印刷スタイル |
| eleventy.config.js | 章順、出力、素材コピー、Pagesサブパス |
| scripts/build-pdf.mjs | 同じHTMLの配信・PDF生成・ハッシュ確認 |
| scripts/static-server.mjs | 127.0.0.1の空きポートで一時配信 |
| scripts/check-propagation.mjs | 一時コピーでの変更伝播確認 |
| test/ | 生成物の検査 |
| .github/workflows/publish.yml | PR検証とmain公開 |
| docs/acceptance.md | 受入結果・引き継ぎ |

## 共通HTMLとPDF

Markdown変換はEleventyだけで行います。manual/manual.11tydata.json の permalink: false により、章別HTMLは出力しません。
変換済み見出しを1段下げ、章ごとのIDを付けます。本文をPDF用に再変換・複製する処理はありません。

PDF化では dist-web/ を /technical-manual-poc/ にローカルHTTP配信します。公開済みPagesから取得しません。
印刷CSSを追加してA4・余白・ページ番号・章開始の改ページを指定します。サンプル原稿は目次を含め4ページです。
HTMLのSHA256を生成前後で比較し、変更されていないことを成功ログで確認します。失敗時には不完全なPDFを削除し、サーバーを終了します。

Noto Sans JPは依存関係から dist-web/fonts/ にコピーし、外部フォント配信に依存しません。
SIL Open Font License 1.1を fonts/LICENSE に同梱します。
PDF本文・画素検査にはMuPDF 1.28.0（AGPL-3.0-or-later、開発・検証用）を使います。ブラウザー向けJavaScriptには含めません。

## GitHub Actions / Pages

| 起動条件 | 処理 |
| --- | --- |
| PR | HTMLを1回生成 → PDF → 成果物検査 → 隔離した変更伝播検査 → PDF成果物保存 |
| mainへのpush | 上記に加え、同じHTMLをPagesへ公開 |
| 手動実行 | mainなら公開、それ以外は検証・PDF保存のみ |

CIはUbuntu 24.04で実行し、公式ActionsをコミットSHAで固定します。
通常成果物のテストは再ビルドせず、変更伝播は別の一時コピー内で実行します。
PDF前後のHTMLハッシュとPages用tar内のHTMLが一致することを確認してから公開します。
PRはデプロイしません。pages: write / id-token: write はmainのデプロイジョブだけに付与します。
マージの強制的な禁止は、別途ブランチ保護で必須チェックを設定した場合だけ有効です。

### 初期設定とPDF取得

1. Settings → Actions → General でワークフロー内の公式 actions/* の実行を許可します。
2. Settings → Pages → Build and deployment → Source を GitHub Actions にします。
3. github-pages環境にブランチ制限がある場合はmainを許可します。
4. PRの検証成功後、人がレビューしてマージします。
5. mainの Deploy GitHub Pages 成功と公開サイトを確認します。

Actions → Publish manual → 成功した実行 → Artifacts → manual-pdf をダウンロードし、ZIP内のmanual.pdfを開きます。
PDF成果物は14日保持します。期限切れならmainでワークフローを再実行します。
github-pages成果物はデプロイ専用です。

### 失敗時とロールバック

- 初回Pages公開で404になった場合はSourceと環境設定を確認し、反映を待って失敗したデプロイジョブだけを再実行します。初回の公開ではこれで成功しました。
- ビルド失敗時は失敗ステップのログを確認します。原稿・画像・フォントの欠落なら入力を修正してPRで再検証します。
- 公開内容を戻す場合は、該当マージをrevertするPRをレビュー・マージし、mainの自動デプロイ成功を確認します。

## 範囲と制約

このPoCは架空の公開原稿だけを扱います。顧客情報・機密情報は入れないでください。
CMS、認証、DB、多言語、製品バリエーション、署名・暗号化、本番運用は対象外です。
既存の technical-manual-publisher は別の保全対象で、専用PoCチェックアウト以外を変更しません。

npm auditには既存のVivliostyle依存関係について15件（critical 1 / high 4 / moderate 10）の指摘があり、未解消です。
依存関係の修正は別途の互換性検証が必要です。CI成功は依存関係の安全性を保証するものではありません。
公開HTMLにはJavaScriptアプリケーションを含めません。

原稿やCSSを変更したら、PDFの全ページを目視でも確認してください。
自動検査は本文・画像の変更反映を検出しますが、すべての文字欠落、見切れ、改ページの妥当性を判定するものではありません。
