# アーキテクチャ

3 種の API v3 ブロックを `block.json` と `blocks-manifest.php` で登録する。保存処理はすべて `InnerBlocks.Content` のみ。編集用の section/div やラベルは保存しない。コア・他社ブロックが必要とする HTML はそのブロック自身が生成する。

## レンダリング

`pre_render_block` は親 Conditional の構造と属性を検証し、invalid や FALSE＋ELSE 不在を空文字で短絡する。IF/ELSE に対しても直接親 `WP_Block` と保存時属性を検査し、非選択側は子に到達する前に空文字を返す。選択側は null を返し、WordPress 標準のレンダリング・コンテキスト伝播に任せる。親の render_callback で出力を削る方式は使わない。

別プラグインが先に非 null を返した場合は尊重する。後続フィルターによる上書き、render_block_data による構造の書き換え、独自のコア外描画処理は保証しない。アクセス制御には使用しない。

判定は `$wp_the_query` の WP_Query メソッドを使用する。投稿カテゴリー所属条件は、メインクエリーの通常投稿詳細と照会対象 ID を確認し、`is_object_in_term()` で直接所属を調べる。特定投稿・固定ページの条件は、公開済みの post/page の ID を検証してからメインクエリーの照会対象 ID と比較する。二次クエリーループに入ってもメインリクエストの状態を保持する。未初期化・管理画面・REST は unknown。REST block-renderer は静的保存ブロックに対応しないため、編集用 JS は PHP プレビューを呼ばない。

## 編集

親に useInnerBlocksProps を1つ置く。IF-only テンプレート、分岐の直接親制限、通常インサーター非表示、templateLock=insert、分岐の移動ロックを組み合わせる。ELSE は明示ボタンから replaceInnerBlocks で追加・確認ダイアログから削除する。分岐内部は templateLock=false で任意ブロックを配置できる。PHP は UI を信用せず構造を再検証する。

表示モードは React のローカル state で保持し、属性には書かない。両分岐の編集ツリーを保持し、直接子の分岐だけをエディター用 CSS で隠す。非表示側はブラウザーのタブ移動・アクセシビリティツリーから除外される。リストビューなどで子が選択されると親の selector が祖先を調べて対象分岐を表示する。ツールバー操作では親に選択を戻してからモードを変更する。複数 Conditional の状態は独立し、ネストへの CSS の漏れを直接子セレクターで防ぐ。

## 依存・翻訳・ライフサイクル

フロント用 JS/CSS はない。公式 WordPress パッケージは dependency-extraction によりコアの登録済みスクリプトを利用する。PHP・JS とブロックメタデータは英語原文、日本語 PO/MO/JSON 同梱。既存の GitHub 更新機構は維持する。無効化・削除フックによる投稿やテンプレートの削除は行わない。

投稿タイプ REST の visibility は public を提供しないため、公式の block_editor_settings_all フィルターで公開かつアーカイブを持つ投稿タイプ名を補完する。候補自体は core-data から取得する。タクソノミーは context=edit の visibility.public を用いる。取得の失敗は hasFinishedResolution と取得結果を照合して通知する。

候補選択は WordPress 標準の `FormTokenField` を共通コンポーネント経由で使う。表示ラベルを ID／スラッグに対応させ、同名項目を区別しつつ、候補外の自由入力は保存しない。保存済み対象は検索候補とは別に取得して表示を維持し、取得できない対象も削除可能なトークンとして保持する。
