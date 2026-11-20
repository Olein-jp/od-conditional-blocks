# 選択対象のトークン表示の調査

WordPress 標準の FormTokenField で、入力欄内に複数の選択済み項目をトークン表示できる。公式資料と同梱 @wordpress/components の実装を照合し、今回の選択欄に採用した。

出典: https://developer.wordpress.org/block-editor/reference-guides/components/form-token-field/

- value で選択済みトークン、suggestions で候補を渡せる。
- onInputChange で REST 候補検索、onChange で追加・削除を処理できる。
- 標準で削除ボタン、矢印キーでの移動、Enter による選択に対応する。
- 標準のタグ入力は自由入力も許すため、候補だけを受け付ける検証と ID／スラッグへの変換を追加する必要がある。入力検証用の __experimentalValidateInput を使用し、onChange 側でも候補外の値を保存しない。
- 同名項目は名前だけでは区別できないため、ID／スラッグを併記する。保存値は従来どおり ID／スラッグとし、名称変更で判定を変えない。
- 検索候補から消えた選択項目も、保存済み対象の取得結果で表示を維持する。削除済み対象は保存値の表示に戻し、トークンから解除可能にする。

独自のタグ風 HTML/CSS は追加せず、コアの見た目とアクセシビリティ操作を利用する。
