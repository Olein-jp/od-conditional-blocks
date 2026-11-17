<?php
/** ブロックとレンダリングフックの登録。
 *
 * @package ODConditionalBlocks
 */

namespace Olein\ODConditionalBlocks;

/** プラグイン初期化。 */
final class Plugin {
	/**
	 * 登録情報を構築する。
	 *
	 * @return void */
	public static function register() {
		$root = dirname( __DIR__ );
		if ( file_exists( $root . '/build/blocks-manifest.php' ) ) {
			wp_register_block_types_from_metadata_collection( $root . '/build', $root . '/build/blocks-manifest.php' );
			foreach ( array( 'conditional', 'if', 'else' ) as $name ) {
				wp_set_script_translations( 'od-conditional-' . $name . '-editor-script', 'od-conditional-blocks', $root . '/languages' );
			}
		}
		add_filter( 'block_editor_settings_all', array( self::class, 'editor_settings' ) );
		add_filter( 'pre_render_block', array( Render_Controller::class, 'filter' ), 10, 3 );
	}
	/**
	 * REST の投稿タイプ情報に含まれない public 属性を候補の絞り込みに補う。
	 *
	 * @param array $settings エディター設定.
	 * @return array
	 */
	public static function editor_settings( $settings ) {
		$types = array();
		foreach ( get_post_types( array( 'public' => true ), 'objects' ) as $type ) {
			if ( $type->has_archive ) {
				$types[] = $type->name;
			}
		}
		$settings['odConditionalPublicPostTypes'] = $types;
		return $settings;
	}
}
