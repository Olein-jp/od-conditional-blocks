# OD Conditional Blocks

条件付きブロック機能を開発するための最小構成です。ブロック機能自体はまだ実装していません。

## 開発環境

- Docker（起動済み）
- Node.js 24.18 以上、npm 11.16 以上（`nvm use` で Node.js 24 を選択）
- PHP 7.4 以上、Composer 2（ホスト実行時のみ）
- プラグインの最低要件: WordPress 6.8 / PHP 7.4

```sh
nvm use
npm ci
npm run env:start
npm run composer -- install
npm run composer -- lint
```

Composer をホストで使用する場合は `composer install` / `composer lint` でも実行できます。
開発サイトは通常 http://localhost:8888（admin / password）です。
`npm run env:stop` で停止、`npm run env:status` で状態確認、`npm run env:cli -- plugin list` で WP-CLI を実行します。
ポートが使用中の場合は `npm run env:start -- --auto-port` で空きポートを選び、起動ログの URL を使用します。
個人用の設定は Git 管理外の `.wp-env.override.json` に記述してください。

## 多言語化

原文は英語、テキストドメインは `od-conditional-blocks` です。日本語の PO / MO と翻訳用 POT を `languages/` に同梱しています。表示文字列には `__()` / `esc_html__()` などを使い、同じテキストドメインを指定してください。

```sh
npm run i18n:pot
# POT をもとに Poedit 等で言語別 PO を更新
npm run i18n:mo
```

他言語は `od-conditional-blocks-<locale>.po` / `.mo` を追加すると利用できます。

## インストールと更新

GitHub Releases の `od-conditional-blocks.zip` を WordPress にアップロードしてください。GitHub の自動生成ソース ZIP は依存ライブラリを含みません。
[WP GitHub Plugin Updater](https://github.com/inc2734/wp-github-plugin-updater) を使用し、公開済みの最新 Release を WordPress の更新画面から取得します。自動更新を有効にした場合も同じ配布 ZIP を使用します。

## リリース

プラグインヘッダー、`package.json`、POT のバージョンを更新してコミット・プッシュした後、`0.0.0` のような **v を付けない数値3桁**のタグをプッシュします。

```sh
git tag 0.0.0
git push origin 0.0.0
```

GitHub Actions が規約チェックとバージョン照合を行い、実行時の `vendor/` と翻訳ファイルを含む ZIP を添付して Release を公開します。開発依存、ローカル設定、node_modules は含めません。依存は lockfile からインストールします。追加のシークレット設定は不要です。

ローカルで同じパッケージを確認する場合:

```sh
composer package
unzip -t dist/od-conditional-blocks.zip
```

配布ファイルを増やした場合は `scripts/package.sh` のコピー対象も更新してください。
CI は PHP 7.4 の WPCS と配布 ZIP 作成を検証します。最小構成のため PHPUnit・PHPStan・JavaScript ビルドは追加していません。
