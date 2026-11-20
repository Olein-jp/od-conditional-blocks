# OD Conditional Blocks

WordPress の投稿・サイトエディターで使う、サーバー側 IF / ELSE 表示制御プラグイン。開発版 **0.1.3**。

- Conditional（条件分岐）直下に IF が1つ、ELSE は任意で1つ。
- 新規挿入時は IF のみ。ELSE は明示ボタンで追加。
- ページ種別・特定アーカイブ・投稿のカテゴリー所属の19条件、AND / OR / 条件ごとの NOT。
- 非選択側は子の PHP コールバック実行前に短絡。
- 編集表示は IF／ELSE／両方。表示切り替えは保存属性に影響しない。
- フロント用の追加 JS/CSS、独自テーブルは不要。

**表示制御専用です。機密情報・アクセス認可には使わないでください。プラグイン停止時には保存済みコンテンツが残り、IF と ELSE の両方が表示される可能性があります。**

## 導入・使い方

WordPress 6.8 以上 / PHP 8.1 以上を対象にしています。ビルド・実行時依存を含む ZIP をアップロードして有効化します。GitHub の自動生成ソース ZIP はそのまま導入できません。

[操作手順・カテゴリー専用案内](docs/usage.md)、[技術検証・テスト結果](docs/validation.md)、[内部設計](docs/architecture.md)、[保存スキーマ](docs/condition-schema.md) を参照してください。条件を設定するまでは公開ページに何も出力しません。

## 開発

Node.js 24.18 以上 / npm 11.16 以上、Composer 2、Docker を使用します。

```sh
nvm use
npm ci
composer install
npm run build
npm run env:start
composer lint
npm run lint:js
npm run test:unit
npm run test:php
```

PHP/Composer をホストに用意できない場合は `npm run composer -- install` 等を使用できます。wp-env の URL は `npm run env:status` で確認してください。ポート衝突時は `npm run env:start -- --auto-port` を使用します。既存環境では localhost:8897 が開発サイトです。

### E2E

ローカル開発 DB 専用の管理者を作ります（実サイトでは実行しないでください）。

```sh
npm run env:cli -- user create od-conditional-e2e od-conditional-e2e@example.test --role=administrator --user_pass=password
npm run env:cli -- user meta update od-conditional-e2e locale en_US
npx playwright install chromium
WP_BASE_URL=http://localhost:8897 npm run test:e2e
```

`WP_USERNAME` / `WP_PASSWORD` / `WP_BASE_URL` でテスト対象を上書きできます。テストはローカル投稿などを作成・保存します。サイトエディター用テーマは Twenty Twenty-Five です。

## 翻訳

英語原文と日本語 PO / MO / JSON を同梱しています。翻訳カタログの更新はビルド後に行います。

```sh
npm run i18n:pot
npm run i18n:mo
npm run i18n:json
```

## 配布・既存の更新機構

既存の WP GitHub Plugin Updater を維持しています。GitHub Releases の未公開・接続不可時には開発ログに 404 等が残る場合があります。条件判定自体は外部通信を行いません。

```sh
npm run build
composer package
unzip -t dist/od-conditional-blocks.zip
```

ZIP は本体、includes、build、languages、docs、readme、実行時 vendor のみを含みます。開発依存・node_modules・テストは含みません。既存のタグ起点 Release ワークフローは維持します。タグ・コミット・プッシュ・リリースは手動指示があるまで行いません。
