# 技術検証と開発記録

検証日：2026-11-17（日本時間）。基準仕様：ユーザー提供の `OD_Conditional_Blocks_Codex_Development_Spec.md` v1.0。コミット・プッシュ・リリースは未実施。

## Step 0：現状確認

- 実装内容：既存コード、依存・翻訳・配布・CI を確認。開始時 `git status --short` は空、既存ユーザー変更なし。
- 既存構成：本体 PHP、GitHub 更新機構、英日翻訳、Composer/WPCS、wp-env、ZIP/Release ワークフロー。ブロック・PHPUnit・JS テストは未実装。
- 実行コマンド：`git status --short`、`node /Users/olein/.agents/skills/wp-project-triage/scripts/detect_wp_project.mjs`、`php -v`、`node -v`、`docker info`、`docker ps`、`wp core version`（Docker 内）。
- 実測：ホスト PHP 8.4.8、初期 Node 20.19.2。開発時はインストール済み Node 24.22.3 を PATH で選択。既存 WordPress 7.1.4 / PHP 7.4.33、開発 URL は当初 localhost:8890。
- 環境上の制限：サンドボックス内から Docker ソケットへは permission denied。承認付きコマンドで Docker を利用。npm インストールもネットワークを許可した実行へ切り替えた。
- 仕様との調整：既存の最低 PHP 7.4 を、仕様書の暫定値 8.1 に揃えた。本体・Composer platform・wp-env・CI・readme に反映。既存の更新機構と翻訳基盤は維持。

## Step 1：技術スパイク

### 実験と実測

実行：`docker exec wp-env-od-conditional-blocks-f888480c-cli-1 wp eval-file wp-content/plugins/od-conditional-blocks/tests/php/spike.php`。

| 検証 | 期待値 | 実測 |
| --- | --- | --- |
| IF 選択時の動的 callback | IF=1、ELSE=0 | IF=1、ELSE=0 |
| フックの直接親 | IF/ELSE とも親 Conditional | 両方 `od-spike/conditional` |
| 公開 HTML | IF のみ | `if` |
| 登録解除後の保存フォールバック | 両分岐の保存 HTML | `<p>IF retained</p><p>ELSE retained</p>` |
| parse→serialize | 保存文字列を保持 | 完全一致 |

変更ファイル：`tests/php/spike.php`、本書。スパイクを先に実行し、結果を確認してから Step 2 の実装を行った。

### 採用した方式

- 親 Conditional と直接子の分岐を `pre_render_block` で検査する。非選択側は `''`、選択側は `null` を返す。フロントの CSS/JS 隠蔽や子レンダリング後の削除は使わない。
- 親の保存は `InnerBlocks.Content`、分岐も同じ。動的 render_callback を持たない保存ブロックと早期フィルターの組み合わせを採用。コアが子を通常レンダリングし、独自ラッパーは出さない。
- UI は useInnerBlocksProps を使い、IF/ELSE の両編集ツリーを保持する。親の React state とエディター専用 CSS で表示を切り替える。公開条件は PHP のみ。
- 保存・再編集、停止後の保持、サイトエディターの表示方式は後続 E2E で実証する。スパイク時点でブラウザ確認済みとは扱っていない。

### 一次情報

[pre_render_block](https://developer.wordpress.org/reference/hooks/pre_render_block/)、[WP_Block::render](https://developer.wordpress.org/reference/classes/wp_block/render/)、[InnerBlocks](https://developer.wordpress.org/block-editor/how-to-guides/block-tutorial/nested-blocks-inner-blocks/)、[メタデータ一括登録](https://developer.wordpress.org/reference/functions/wp_register_block_types_from_metadata_collection/) と、実行環境の `wp-includes/blocks.php` / `class-wp-block.php` を照合した。

## Step 2：最小エンドツーエンド

- 実装内容：API v3 の3ブロック、IF-only 初期生成、ELSE 明示追加、ラッパーなし保存、メタデータ一括登録、カテゴリー条件、早期中断。
- 変更ファイル：`src/{conditional,if,else}/`、`includes/class-plugin.php`、`includes/class-render-controller.php`、本体 PHP、package.json と lock、build。
- 実行：`npm run build`、PHP 結合テスト、Playwright。
- 成功：ブロック登録・ビルド、IF/ELSE の保存再編集。非表示側の callback は0回。
- 残課題：この段階の条件拡張・UI・E2E は Step 3〜5 で対応。

## Step 3：条件エンジン

- 実装内容：内部レジストリ、18種類の条件、入力型・上限・対象存在検査、AND/OR/NOT、三状態評価、メインリクエスト固定、構造不正時の fail-closed。明示的な null と属性省略を区別する。
- 変更ファイル：`includes/class-condition-{registry,validator,evaluator}.php`、`tests/php/`、`phpunit.xml.dist`、Composer。
- 実行：`docker exec -w /var/www/html/wp-content/plugins/od-conditional-blocks <tests-cli> php vendor/bin/phpunit -c phpunit.xml.dist`。
- 成功：WordPress 6.8 / PHP 8.1.34 で **17テスト・95アサーション**。初期の WordPress 7.1.4 / PHP 7.4.33 でも null 回帰テスト追加前の15件・77アサーションが成功。
- 検証内容：TRUE/FALSE/ELSEなし、動的 callback 回数、全 AND/OR 真偽組合せと NOT、不明・ゼロ件・型改変・null・上限・スキーマ版、enabled=false、重複分岐・孤立分岐、ネスト、二次クエリー、未初期化、削除済みターム、公開タクソノミー/投稿タイプ、固定トップ/投稿一覧、全レジストリ API、先行フィルター、パターン、テンプレートパーツ、Query Loop、REST、保存フォールバック。
- 発見・修正：PHPUnit Polyfills 不足を開発依存で解消。パターンはコアの resolve_pattern_blocks を通して検証。テンプレートパーツは wp_theme タームを明示付与。REST block-renderer は edit コンテキストを要求し、静的ブロックなので404 block_invalid。編集プレビューは JS が担当する。

## Step 4：編集 UX

- 実装内容：InspectorControls、18条件のラベル、条件追加・削除・NOT/AND/OR、REST 候補の検索、未設定警告、管理ラベル、IF/ELSE/両方、分岐ラベル、ELSE 削除確認、リストビュー連動。
- 変更ファイル：`src/conditional/edit.js`、`src/conditional/editor.scss`、`src/condition-editor.js`、`src/conditions.js`、`src/branch-edit.js`、`tests/js/`。
- 実行：`npm run format`、`npm run lint:js`、`npm run test:unit`。
- 成功：JS ユニット **5件**、JS 規約チェック、PHP WPCS。保存対象とは別の React state を使い、モード変更だけでは投稿の dirty を作らないことを E2E で確認。
- 発見・修正：useInnerBlocksProps の実 DOM は直接子に分岐を出すため、従来の InnerBlocks の DOM を想定した CSS では切り替わらなかった。実 DOM に合わせた直接子セレクターへ修正し、非選択側の非表示を再検証した。
- 残課題：手動のスクリーンリーダー読み上げ確認は未実施。自動テストでは非表示状態とリストビューのキーボード展開・子へのフォーカスを検証。

## Step 5：結合・E2E

- 変更ファイル：`tests/e2e/editor.spec.js`、`playwright.config.js`、CI/Release ワークフロー、languages。
- コマンド：`WP_BASE_URL=http://localhost:8895 npm run test:e2e`（最低版）、`WP_BASE_URL=http://localhost:8897 npm run test:e2e`（既存環境を PHP 8.1 に更新後）。
- 最低対応専用環境：`/tmp/od-conditional-wp68/.wp-env.json` で core=WordPress/WordPress#6.8、PHP=8.1。wp-env start 時の8893ポート衝突を `--auto-port` で回避。開発8895、テスト8896。
- 既存環境：DB を保持して PHP 8.1 に更新し、`--auto-port` で開発8897、テスト8898へ。更新前の PHP 7.4 では最低要件変更後の再有効化が拒否されたため、PHP 8.1 更新後に再検証する。
- E2E 範囲：新規 IF-only、ELSE1つ、両分岐の内容保持、表示切替の dirty、保存・再読込・妥当性、削除確認と Undo/Redo、サイトエディター、条件 UI、NOT/OR 保存、複製・ネスト、実リストビュー・フォーカス、実カテゴリー/タグ、停止時の両分岐露出と raw content 完全一致、フロント追加アセットなし。
- 全体の最終実行結果は下記に記録する。
- CI は最低6.8と配布される現行コアを対象にビルド・規約・PHP/JS/E2E・ZIP を実行する定義を追加。GitHub Actions 上では未実行（プッシュ禁止を遵守）。

## Step 6：納品と制約

- 変更ファイル：README、readme.txt、docs一式、scripts/package.sh、日本語 PO/MO/JSON、ビルド成果物。
- `composer package`：成功。実行時 vendor は2パッケージのみ、開発依存は同梱しない。`unzip -t dist/od-conditional-blocks.zip`：成功。
- 既存 GitHub 更新機構は維持。未公開 Release への問い合わせで404ログが出ることがある。新しい条件処理自体には外部 API 通信なし。
- npm audit は開発依存に20件（high 2 / moderate 15 / low 3）。high は wp-env 経由の isomorphic-git と wp-scripts 経由の serialize-javascript。推奨自動修正は親パッケージの別メジャーへの変更のため無断適用しない。これらは配布 ZIP に含まれない。Composer audit は指摘なし。
- 他社すべてのブロック、全テーマ、マルチサイト、手動支援技術テスト、全 PHP 最新版の網羅は未実施。条件専用のフロントアセット、公開条件拡張 API は追加しない。
- 競合制約：当フィルターに渡った先行非 null は保持する。後続または別経路のフィルターによる上書きは保証できない。停止時の両分岐露出は仕様上の制約であり、アクセス認可には使用できない。

## 最終実行結果

| チェック | 結果 |
| --- | --- |
| WordPress 6.8 / PHP 8.1.34 PHPUnit | 17件・95アサーション成功 |
| WordPress 7.1.4 / PHP 8.1.34 PHPUnit | 17件・95アサーション成功 |
| JS ユニット | 5件成功 |
| WPCS / JS lint / Composer validate | 成功 |
| wp-scripts build と blocks-manifest | 成功 |
| msgfmt --check | 成功 |
| Playwright：WordPress 6.8 / PHP 8.1.34 | 6件成功（29.5秒） |
| Playwright：WordPress 7.1.4 / PHP 8.1.34 | 6件成功（33.2秒） |
| 配布 ZIP | composer package / unzip -t 成功。最終ドキュメントも同梱 |

追加検証で、REST ターム候補取得のエラー検査に存在しない selector を参照していた点を修正。公式 core-data の取得結果と hasFinishedResolution を使用し、実際の検索・選択を E2E に追加した。また、投稿タイプ REST の visibility には public が含まれないため、公式 block_editor_settings_all で公開アーカイブの投稿タイプ名を補完し、PHP 結合テストで public=false の候補除外と文字列 has_archive を検証した。これは条件の意味論の変更ではなく、候補取得の実装上の補足である。

変更ファイルは本体 PHP、includes（5ファイル）、src（3ブロックと共通 UI）、build、tests（PHP/JS/E2E）、phpunit.xml.dist、playwright.config.js、vitest.config.mjs、package/composer と各 lock、phpcs.xml.dist、wp-env、CI/Release、翻訳、配布スクリプト、readme と docs。既存の変更・Git 履歴は保持した。


E2E の初回案内・インスペクター開閉・リストビューの折りたたみをテスト側で扱い、コアの画面読み込み後に操作するよう修正した。実行時の一時的な REST 確認コマンドでは PHP の括弧ミスと /dev/stdin 非対応を検出し、コンテナーへコピーした一時ファイルで再実行して正常レスポンスを確認した。プラグイン本体の PHP エラーではない。

失敗した E2E で残った固有名 od-e2e-* の公開テスト投稿・テンプレート・タームは後片付けし、プラグインは有効へ復帰。レビュー用のテスト下書きと専用ローカル管理者は残している。既存開発サイトは http://localhost:8897。最低版の一時環境は検証後に停止する。手動スクリーンリーダー確認、GitHub Actions 実行、他社ブロック・テーマの網羅は未検証。
