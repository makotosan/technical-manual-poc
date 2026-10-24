# Technical Manual PoC

架空のTM-100取扱説明書を、Markdown → Eleventy → 共通HTML → Vivliostyle PDFで出版するPoCです。
v0.1の3章原稿はmanual/に保全し、v0.2の前付・12章・付録A〜Eはmanual-v02/に置きます。
v0.2はWeb目次と章別HTMLを生成し、その同じ19文書から1冊のPDFを組版します。別のMarkdown変換、結合HTML、PDFの結合は行いません。

## 実行環境

Node.js **24.19.0** / npm **10.7.0** を使用します。.node-version/.nvmrc、package-lock.json、ActionsのSHAを固定しています。

~~~powershell
git clone https://github.com/makotosan/technical-manual-poc.git
cd technical-manual-poc
npm ci
npx @puppeteer/browsers install chrome@155.0.8059.84 --path "$env:LOCALAPPDATA\vivliostyle\browsers"
~~~

Vivliostyleが使うChromeは155.0.8059.84です。CLIのブラウザー保存先へインストールしてください。CIのインストールコマンドは.github/workflows/publish.ymlを参照してください。
Node/npm/Chromeをそろえたクリーンチェックアウトで、下記の両版の検査を実行します。CIも毎回クリーンチェックアウトとnpm ciから実行します。

## ビルドと検証

既定のローカルビルドはv0.1です。版はコマンド引数（優先）又はMANUAL_VARIANTで選択できます。

~~~powershell
npm test
npm run build:pdf -- --variant=v0.1
npm run build:pdf -- --variant=v0.2
npm run build:pdf:from-html -- --variant=v0.2
~~~

通常の出力はdist-web/とdist-pdf/manual.pdfです。Webの再ビルドは生成先だけを選択した版で作り直します。PDFのみのビルドは直前に生成したHTMLの版と順序を検査します。

v0.1を上書きしない全編v0.2検証と公開用の準備:

~~~powershell
npm run editorial:check
npm run v02:test
npm run v02:reproducibility
npm run v02:browser
npm run pages:stage
~~~

v02:testはdist-v02-web/・dist-v02-pdf/に分離して生成します。v02:browserは固定Chromeを使用し、必要ならVISUAL_BROWSER_PATHで実行ファイルを指定します。
spike:test（短いサイドバー検証）・visual:test（図表/18種の警告）もCIで実行します。
開発時に別の出力先を使う場合は[出版構成](docs/publication.md)を参照してください。

## WebとPDF

- [公開サイト](https://makotosan.github.io/technical-manual-poc/)
- [配布PDF](https://makotosan.github.io/technical-manual-poc/manual.pdf)
- [Actionsの実行・レビュー成果物](https://github.com/makotosan/technical-manual-poc/actions)

Issue #15のPRマージ後、Pagesはv0.2のdist-pages/を公開します。ローカルの既定v0.1と公開対象の選択は独立しています。
PDFダウンロードは各ページに表示し、印刷時には隠します。索引・用語集から章や節へ移動できます。
Noto Sans JPは依存から同梱し、外部フォント配信に依存しません。SIL Open Font Licenseをfonts/LICENSEへ同梱します。
MuPDF 1.28.0（AGPL-3.0-or-later）は開発・検証用で、ブラウザーのJavaScriptには含めません。

## CI・公開と確認

PRでは両版の検査と公開用ファイルの梱包だけを行います。人がレビューしてマージすると、mainが同じ検査を行ってPagesへデプロイします。
pages: write / id-token: writeはmainのデプロイジョブだけに付与します。必須チェックの強制は別途ブランチ保護で設定します。

pages:stageはv0.2の入力HTMLハッシュとPDFを照合し、全Webファイルをdist-pages/へコピーしてバイト一致を検査します。
publication-evidence.jsonにビルドcommit、全HTMLとPDFのSHA256を保存します。Pages用tarを展開して全ファイルが同じことも検査します。
v0.1のmanual-pdf、v0.2のv02-publication-reviewなどのActions成果物は14日保持します。公開PDFは次のデプロイまでPagesに残ります。

初期設定はSettings → Pages → Source = GitHub Actionsです。環境のブランチ制限はmainを許可します。
mainのDeploy成功後、公開内容を次のコマンドで照合します（SHAは実際のマージcommitへ置き換えます）。

~~~powershell
node scripts/check-publication-live.mjs --commit=MERGE_COMMIT_SHA
~~~

#15はマージだけで閉じず、公開チェック、PDFダウンロード、人による承認を確認してからv0.2.0タグを作成しクローズします。タグは自動作成しません。

## ロールバックと保全

不具合時はIssue #15の公開切替PRをrevertするPRを作り、レビュー・マージしてmainのデプロイ成功を確認します。元の公開v0.1へ戻す場合は、公開workflowのpathと梱包検査も一緒に戻します。
v0.1.0タグとmanual/を保全し、旧technical-manual-publisherは変更しません。生成ファイルを原稿として編集しないでください。

## 受入記録と限界

[最終受入](docs/v02-acceptance.md) / [編集レビュー](docs/editorial-review.md) / [規格ギャップ評価](docs/jis-b9719-assessment.md) / [図表・警告](docs/figures-warnings.md)

本書は出版検証用の架空サンプルです。PoCゲートの合格は、ISO/JIS適合、機械の安全性能、実機用説明書の承認を意味しません。未完了は[Issue #22](https://github.com/makotosan/technical-manual-poc/issues/22)で追跡します。原稿の0.2-draft表示は実機用文書が未承認であることを示し、出版PoCのタグとは区別します。
CMS、認証、DB、多言語、署名・暗号化、本番運用は対象外です。公開HTMLにJavaScriptアプリは含めません。
既存の依存監査指摘は15件（critical 1 / high 4 / moderate 10）で未解消です。CI成功は依存の安全性を保証しません。
自動検査だけでは全ての見切れ・改ページを判定できません。原稿やCSS変更後はPDF全ページを目視確認してください。
