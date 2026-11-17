#!/usr/bin/env bash
# 本体と実行時依存関係だけを含むインストール用 ZIP を作成する。
set -euo pipefail
cd "$(dirname "$0")/.."
version="$(php -r 'preg_match("/^ \* Version: (.+)$/m", file_get_contents("od-conditional-blocks.php"), $m); echo $m[1];')"
if [[ -n "${1:-}" && "$1" != "$version" ]]; then
  echo "タグとプラグインのバージョンが一致しません: $1 / $version" >&2
  exit 1
fi
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
mkdir -p "$stage/od-conditional-blocks" dist
cp od-conditional-blocks.php README.md LICENSE composer.json composer.lock "$stage/od-conditional-blocks/"
test -f build/blocks-manifest.php || { echo "先に npm run build を実行してください。" >&2; exit 1; }
cp readme.txt "$stage/od-conditional-blocks/"
cp -R build includes docs languages "$stage/od-conditional-blocks/"
composer install --working-dir="$stage/od-conditional-blocks" --no-dev --prefer-dist --optimize-autoloader --no-interaction --no-progress --no-plugins --no-scripts
rm "$stage/od-conditional-blocks/composer.json" "$stage/od-conditional-blocks/composer.lock"
output="$(pwd)/dist/od-conditional-blocks.zip"
rm -f "$output"
(cd "$stage" && zip -qr "$output" od-conditional-blocks)
echo "$output"
