# Issue #13: v0.1/v0.2の選択と章別HTML出版

## 使い方

既定はv0.1です。既存manual/の原稿・生成内容を維持します。

npm run build:web
npm run build:pdf
npm run build:web -- --variant=v0.1
npm run build:pdf -- --variant=v0.2
npm run build:web -- --variant=v0.2
npm run build:pdf:from-html -- --variant=v0.2

MANUAL_VARIANTもv0.1/v0.2の明示選択に使えます。コマンド引数を優先し、不明な値はエラーにします。
出力はdist-web/、dist-pdf/manual.pdfです。Webを作り直すと生成用dist-web/を消して選択した版だけを生成します。原稿は削除しません。
PDFだけを生成するfrom-htmlは、直前の選択とHTML入力一覧を検査します。v0.1のHTMLをv0.2のPDF入力として使いません。

両版を比較する検証は npm run v02:test を使用します。出力をdist-v02-web/、dist-v02-pdf/へ分離し、既定v0.1を上書きしません。
npm run v02:browserでローカルの19文書・画像・モバイル・キーボードを検査します。Chrome実行ファイルは必要に応じてVISUAL_BROWSER_PATHで指定します。

## 一つのマニフェストと同じHTML

manual-v02/publication.jsonをWebナビゲーション、出力先、見出し照合、目次、PDF順序の正本にします。
sample-data/content-inventory.yamlは引き続き編集台帳です。#16の短いmanual-v02/manifest.jsonも検証素材のため独立して保全します。
前付・12章・付録A〜Eの18文書はchapters/{front,ch-01..12,app-a..e}.htmlへ出力し、index.htmlは本文を結合しない目次です。
各章のMarkdownをEleventyのRenderPluginで一度HTML化し、共通警告も同じライブラリで展開します。見出し、図、表に章固有IDを与え、原稿の相対.mdリンクを公開先へ書き換えます。
見出しの追加・変更はマニフェストと照合し、不整合ならビルドを止めます。図表の正本はvisual-inventory.jsonで、全27図・54表を目次から参照します。

PDFのentryは前付→目次→第1〜12章→付録A〜Eです。生成済みHTMLだけをVivliostyleへ渡し、全入力HTMLのSHA256が生成前後で一致することを検査します。
PDF用の別Markdown、章のmega-HTML結合、章別PDFの結合はありません。Vivliostyle内部の作業コピー・DOM再直列化はCLIの内部処理で、元HTMLのバイト一致を保証する対象とは区別します。

## 画面と印刷

#16の左目次・狭幅details・スキップリンク・現在章表示を再利用します。本文の外側のWeb操作は印刷CSSで非表示にし、grid/余白をリセットします。
図は画像自体のIDだけに依存せず、図を包む要素をリンク先にします。Vivliostyle PDFで図一覧から宛先を解決できることを確認します。
表は画面で横スクロール可能、印刷では幅を戻し、見出し行を反復します。警告は#12の共通CSSを読み込みます。
全付録C（12リスクの詳細・ラベル対応）も実際の本文から変換し、検証用の空の入口に置き換えません。

## CIと公開

CIは既定v0.1、短文spike、警告fixtureに加え、分離したv0.2を生成・検証します。
v02-publication-review artifactに全HTML、PDF、入力ハッシュ、全ページ画像を保存します。
Issue #15の公開切替後は、検証済みv0.2をdist-pages/に梱包してPagesへ渡します。既定のローカル選択はv0.1のままです。公開前の全HTML/資産/PDF一致と、tar展開後の一致を検査します。

## 受入の境界

本Issueでは章HTML/参照/目次/順序/共通PDFと版選択を検証します。最終確認PDFは75ページで、60〜80の範囲に収まります。
全体の編集整合・長文の最終受入は#14/#15、規格適合・実機安全性の残件は#22です。現PoC文書ゲートの合格を規格適合の宣言と混同しません。

2026-10-25検証: 全19文書のブラウザー検査、PDF 75ページ・849内部リンクの宛先解決、全HTML入力ハッシュ一致、既存v0.1テストと明示選択のHTML一致を確認。図と斜体キャプションをfigure要素にまとめ、別ページへの分離を抑制しました。
編集確認への引継ぎ: 旧警告IDの統合により同一警告が連続する箇所があるため、#14で重複配置を整理します。

## Issue #15の公開検証

PDF生成成功後、同じPDFをWebルートのmanual.pdfへコピーします。入力HTMLは変更しません。各章のダウンロードリンクは印刷CSSで非表示です。
PUBLICATION_OUTPUT_PREFIX=dist-release等でブラウザー/受入/再現性/梱包スクリプトの入力先を指定できます。ビルド時には対応する--output-prefixを明示してください。既定はdist-v02です。
過去の#13の75ページ・849リンク、#14の76ページ・863リンクは各時点の証拠です。公開版の最終結果はdocs/v02-acceptance.mdへ記録します。
