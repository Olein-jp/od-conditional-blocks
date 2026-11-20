=== OD Conditional Blocks ===
Contributors: olein
Tags: conditional, blocks, site-editor
Requires at least: 6.8
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 0.1.3
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Server-side IF / ELSE display conditions for nested blocks.

== Description ==

条件分岐ブロックの IF / ELSE に任意のブロックを配置し、リクエストのページ種別でサーバー側の表示を切り替えます。非選択側の子ブロックは実行しません。AND / OR / NOT と19種類の条件に対応します。

表示制御専用です。アクセス認可や機密保持には使用しないでください。プラグイン停止時は子コンテンツが保持され、IF と ELSE の両方が公開表示される可能性があります。

== Installation ==

1. ビルド済みのプラグイン ZIP をアップロードして有効化してください。
2. 投稿またはサイトエディターで「条件分岐」を追加してください。
3. インスペクターで条件を設定して IF を編集してください。必要な場合だけ ELSE を追加してください。

== Frequently Asked Questions ==

= 条件が未設定の場合は？ =

どちらの分岐も公開表示しません。「条件を有効にする」をオフにすると IF を常時表示します。

= フロントエンドで JavaScript は必要ですか？ =

条件処理用のフロントエンド JavaScript はありません。

== Changelog ==

= 0.1.3 =
* 投稿詳細ページで、指定カテゴリーへの所属によって IF / ELSE を切り替える条件を追加しました。
* 複数カテゴリーの選択と NOT による「いずれにも属していない」の判定に対応しました。
* 日本語翻訳、操作手順、条件判定・保存再読込のテストを更新しました。

= 0.1.2 =
* インスペクターの「条件を追加」ボタンと区切り線の間に 16px の余白を追加しました。

= 0.1.1 =
* エディター本文内の名称と ELSE なしの説明を設定サイドバーに集約しました。
* 分岐ラベルは「両方」表示時だけ小さく表示し、独自の枠線と内側余白を削除しました。

= 0.1.0 =
* 開発版。IF / ELSE、条件エンジン、編集表示切り替えを追加しました。
