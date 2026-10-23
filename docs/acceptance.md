# PoC v0.1 受入確認と引き継ぎ

最終PRのレビュー・マージ前の受入記録です。最終main実行の公開確認まで終えてからPoC v0.1完了とします。

## 確認項目

| 項目 | 確認方法・結果 |
| --- | --- |
| 3章・章順・章アンカー | 生成HTMLの自動検査、公開サイトの章IDとリンク確認 |
| PDFの日本語本文・章順 | MuPDFで実際のPDFテキストを抽出して検査 |
| A4・複数ページ | pdf-libで全ページを解析して検査 |
| PNG・SVG・表・改ページ | サンプルPDF全4ページを画像化して目視確認 |
| 共通HTML経路 | PDF前後のSHA256、Pagesアーカイブ内index.htmlの比較 |
| 文章・画像の変更伝播 | test:propagationが一時コピーの安全章に文章とマゼンタの差し替えSVGを追加。HTMLの文章/画像参照、PDF本文/実際のマゼンタ画素を検査 |
| 通常原稿の保全 | 変更伝播テスト終了時、元原稿と通常HTML/PDFの一致を確認。一時コピーを削除 |
| 再現性 | 固定Node/npm、lockfile、未変更原稿でHTML再ビルド一致。クリーンクローンでの結果はPRに記録 |
| PR・main Actions | PRは検証のみ。mainは公開。下記の実行履歴と最終PRのChecksを参照 |
| PDFダウンロード | mainのmanual-pdf成果物をAPI経由で取得成功 |
| 既存資産保全 | 旧technical-manual-publisherへの変更なし。ローカル移動後の同名フォルダーは空のまま |

## 公開確認済みの実行

- [PR #9](https://github.com/makotosan/technical-manual-poc/pull/9): LinuxでHTML/PDF生成・9件の検査成功。PR公開はスキップ。
- [mainの初回公開実行](https://github.com/makotosan/technical-manual-poc/actions/runs/39858940143): ビルド、成果物検査、HTML一致、PDF保存成功。初回デプロイの404は設定反映後の失敗ジョブ再実行で成功。
- [公開サイト](https://makotosan.github.io/technical-manual-poc/): 本文、CSS、PNG、SVG、フォントCSSのHTTP 200と全章アンカーを確認。
- この最終PRのLinux検証結果とクリーンクローン確認結果はPR本文に記録します。

## 他の開発者・Codexへの引き継ぎ

1. READMEの固定Node/npmを用意し、専用フォルダーへcloneしてnpm ci。
2. READMEのコマンドでHTML/PDFを生成し、npm testを実行。
3. dist-pdf/manual.pdf の全ページを確認。変更伝播の比較画像は dist-acceptance/baseline-*.png と changed-*.png。
4. 原稿は manual/、画面は styles/web.css、印刷は styles/print.css を編集。生成HTML/PDFは編集しない。
5. 変更はIssueごとのブランチとPRで検証し、人によるレビュー後にマージ。
6. mainのActionsと公開サイト、PDFダウンロードを確認。失敗時とロールバックはREADMEを参照。

## 判定の限界

- PDFのバイト一致は要求しない。生成日時、OS、改行コードなどによってファイルハッシュは変わり得る。
- 画素検査は変更画像の反映確認であり、すべてのレイアウト不具合を検出しない。
- 既知の依存関係監査指摘は未解消。READMEを参照。本番適用はこのPoCの受入範囲外。
