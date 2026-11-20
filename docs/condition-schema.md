# 保存スキーマ v1

属性は `schemaVersion`（整数 1）、`enabled`（boolean、既定 true）、`label`（任意の文字列）、`conditionGroup`。

```json
{"schemaVersion":1,"enabled":true,"label":"カテゴリー案内","conditionGroup":{"operator":"AND","conditions":[{"id":"rule-1","type":"request/category_archive","operator":"is","value":true,"negate":false}]}}
```

`conditionGroup.operator` は AND / OR。conditions は 1〜20 件のリスト。各 id は空でない最大100バイトの文字列で、グループ内で一意。negate は boolean（省略 false）。invalid を NOT で反転しない。全ルールを検証してから真偽判定するため、OR に未知条件が混ざっても true にはならない。

通常条件は `operator: "is", value: true`。安定 ID は `request/` に続く front_page / posts_page / single_post / page / singular / category_archive / tag_archive / taxonomy_archive / post_type_archive / date_archive / author_archive / any_archive / search / not_found。

特定対象は `operator: "in"` を使用する。

| 条件 ID（request/ 以下） | value |
| --- | --- |
| post_category | 表示中の通常投稿に直接付与されたカテゴリー ID またはスラッグの配列 |
| category_term | カテゴリー ID（正整数）またはスラッグの配列 |
| tag_term | タグ ID またはスラッグの配列 |
| taxonomy_term | `{ "taxonomy": "genre", "terms": [12] }` |
| post_type_archive_of | アーカイブを持つ公開投稿タイプのスラッグ配列 |

比較値は1〜100件、文字列は空でなく最大200バイト。タクソノミー／投稿タイプの public、投稿タイプの has_archive、すべてのタームの存在を PHP で検査する。組み込みカテゴリー・タグに taxonomy_term は使用せず専用 ID を使う。UI は REST の候補を検索して ID を保存する。REST 非対応タクソノミーは候補を取得できない旨を表示する。

enabled=false はスキーマ版・enabled の型・正常な分岐構造を確認して IF を出力する。条件の未設定とは異なる明示的なバイパス。不明な schemaVersion は無効化されていても拒否する。

将来の公開条件登録 API は未公開。レジストリを内部実装として保ち、保存 ID の拡張・移行は将来明示する。

`request/post_category` はメインリクエストの通常投稿詳細で、指定カテゴリーのいずれかへの直接所属を評価する。`negate: true` はいずれにも属していない場合に一致。通常投稿詳細以外・対象投稿が取得できない場合・ターム照会エラーは判定不能（null）とし、NOT や OR でも表示せず条件分岐全体を閉じる。既存の category_term は引き続きアーカイブ専用。
