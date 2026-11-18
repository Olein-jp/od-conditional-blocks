<?php
/**
 * Plugin Name: OD Conditional Blocks
 * Plugin URI: https://github.com/Olein-jp/od-conditional-blocks
 * Description: Server-side IF / ELSE display conditions for nested blocks.
 * Version: 0.1.1
 * Requires at least: 6.8
 * Requires PHP: 8.1
 * Author: Koji Kuno
 * Author URI: https://olein-design.com
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: od-conditional-blocks
 * Domain Path: /languages
 * Update URI: https://github.com/Olein-jp/od-conditional-blocks
 *
 * @package ODConditionalBlocks
 */

namespace Olein\ODConditionalBlocks;

defined( 'ABSPATH' ) || exit;

add_action( 'init', __NAMESPACE__ . '\\load_translations' );
add_action( 'plugins_loaded', __NAMESPACE__ . '\\initialize_updater' );

/**
 * 同梱された翻訳ファイルを登録する。
 *
 * @return void
 */
function load_translations() {
	load_plugin_textdomain( 'od-conditional-blocks', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
}

/**
 * GitHub Releases からの更新を初期化する。
 *
 * @return void
 */
function initialize_updater() {
	$autoload = __DIR__ . '/vendor/autoload.php';
	if ( ! file_exists( $autoload ) ) {
		add_action( 'admin_notices', __NAMESPACE__ . '\\missing_dependencies_notice' );
		return;
	}

	require_once $autoload;

	new \Inc2734\WP_GitHub_Plugin_Updater\Bootstrap(
		plugin_basename( __FILE__ ),
		'Olein-jp',
		'od-conditional-blocks'
	);
}

/**
 * ソースから導入した場合の依存関係不足を通知する。
 *
 * @return void
 */
function missing_dependencies_notice() {
	if ( ! current_user_can( 'activate_plugins' ) ) {
		return;
	}
	printf(
		'<div class="notice notice-error"><p>%s</p></div>',
		esc_html__( 'OD Conditional Blocks: Dependencies are missing. Install the ZIP from GitHub Releases or run composer install in the plugin directory.', 'od-conditional-blocks' )
	);
}

/**
 * ブロック機能を読み込む。
 *
 * @return void
 */
function initialize_blocks() {
	foreach ( array( 'condition-registry', 'condition-validator', 'condition-evaluator', 'render-controller', 'plugin' ) as $component ) {
		require_once __DIR__ . '/includes/class-' . $component . '.php';
	}
	Plugin::register();
}
add_action( 'init', __NAMESPACE__ . '\\initialize_blocks' );
